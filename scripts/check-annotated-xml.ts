// Browser check for the XML pane of the workspace page: click, deep link, keyboard, tooltip, beginner mode,
// cross-pane selection and axe.
// Needs a built dist (npm run build).
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Locator, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";

const { server, url } = await serveDist();
const page = `${url}messages/pacs.008.001.14/`;
const el = (path: string) => `[data-id="${path}"]`;
const sel = (path: string) => `${el(path)}[aria-current='true']`;
const ISO = "Point to point reference, as assigned by the instructing party";
const MSGID = "GrpHdr/MsgId";
// The close event that restores focus fires after Esc, so wait for an element to hold focus.
const focused = async (p: Page) => {
  await p
    .waitForFunction(
      () => document.activeElement?.hasAttribute("data-id"),
      null,
      {
        timeout: 1000,
      },
    )
    .catch(() => {});
  return p.evaluate(() => document.activeElement?.getAttribute("data-id"));
};

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
// false on timeout, so a missing state fails its check instead of aborting the run
const until = (l: Locator, ms = 2000) =>
  l.waitFor({ timeout: ms }).then(
    () => true,
    () => false,
  );
// Pane widths in pixels, measured; the panes are the grid items #panel-ws-*.
const widths = (p: Page) =>
  p.evaluate(() => {
    const w = (id: string) =>
      document.getElementById(`panel-ws-${id}`)!.getBoundingClientRect().width;
    return {
      grid: document
        .getElementById("panel-ws-xml")!
        .parentElement!.getBoundingClientRect().width,
      xml: w("xml"),
      tree: w("tree"),
      details: w("details"),
    };
  });
const near = (x: number, y: number) => Math.abs(x - y) <= 1;
// "XML:true:0,Tree:false:-1,…": each tab's name, aria-selected and tabindex
const tabState = (p: Page) =>
  p.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[role=tab]")]
      .map(
        (t) =>
          `${t.textContent}:${t.getAttribute("aria-selected")}:${t.tabIndex}`,
      )
      .join(),
  );
const shownPanes = (p: Page) =>
  p.evaluate(() =>
    ["xml", "tree", "details"]
      .filter((x) =>
        document.getElementById(`panel-ws-${x}`)!.checkVisibility(),
      )
      .join(),
  );
const frames = (p: Page) =>
  p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const open = async (width: number, height: number, hash = "") => {
  const p = await (
    await browser.newContext({ viewport: { width, height } })
  ).newPage();
  await p.goto(page + hash, { waitUntil: "networkidle" });
  return p;
};
async function axe(p: Page, what: string) {
  for (const theme of ["light", "dark"]) {
    await p.evaluate(
      (t) => document.documentElement.classList.toggle("dark", t === "dark"),
      theme,
    );
    const { violations } = await new AxeBuilder({ page: p }).analyze();
    check(violations.length === 0, `axe ${what} (${theme})`);
    for (const v of violations)
      console.log(`  ${v.id} [${v.impact}] ${v.help}`);
  }
}

try {
  // desktop
  const d = await open(1280, 900);
  const aside = d.getByRole("complementary", { name: "Element details" });
  check((await aside.count()) === 1, "panel region has an accessible name");
  await d.click(el(MSGID));
  check(
    (await aside.innerText()).includes(ISO),
    "click on MsgId shows the ISO definition",
  );
  check(
    (await d.locator("[aria-live] h2").innerText()) === "MessageIdentification",
    "live title names the element",
  );
  await axe(d, "desktop panel, MsgId selected");
  await aside.getByRole("button", { name: "<GrpHdr>" }).click();
  check((await d.locator(sel("GrpHdr")).count()) === 1, "breadcrumb selects");
  await d.locator("[role=tooltip]").waitFor({ state: "detached" }); // Esc would first dismiss a tooltip
  await d.keyboard.press("Escape");
  check(
    (await d.locator("[aria-current='true']").count()) === 0,
    "Esc clears the selection after a breadcrumb click (focus on body)",
  );
  // Esc from other places in the workspace; the click leaves a tooltip, so move focus and wait it out
  const escFrom = async (focus: () => Promise<void>) => {
    await d.click(el(MSGID));
    await focus();
    await d.locator("[role=tooltip]").waitFor({ state: "detached" });
    const where = await d.evaluate(() => {
      const a = document.activeElement!;
      return a.closest("aside")
        ? "aside"
        : a.closest("[role=tree]")
          ? "tree"
          : a.tagName;
    });
    await d.keyboard.press("Escape");
    // the clear lands a render later: poll for it (false on timeout)
    const cleared = await d
      .locator(sel(MSGID))
      .waitFor({ state: "detached", timeout: 1000 })
      .then(
        () => true,
        () => false,
      );
    return { where, cleared };
  };
  const inAside = await escFrom(() =>
    aside.getByRole("button", { name: "<GrpHdr>" }).focus(),
  );
  check(
    inAside.where === "aside" && inAside.cleared,
    "Esc clears the selection with focus in the aside",
  );
  const inTree = await escFrom(() =>
    d.locator("[role=treeitem][tabindex='0']").focus(),
  );
  check(
    inTree.where === "tree" && inTree.cleared,
    "Esc clears the selection with focus in the tree pane",
  );
  const inSearch = await escFrom(() => d.getByLabel("Find an element").focus());
  check(
    inSearch.where === "INPUT" && !inSearch.cleared,
    "Esc in the search box keeps the selection",
  );
  await d.keyboard.press("Tab"); // leave the box; the next checks start from the XML pane
  await d.click(el(MSGID));
  await d.locator("[role=tooltip]").waitFor({ state: "visible" });
  await d.keyboard.press("Escape"); // the first Esc dismisses the tooltip
  await d.keyboard.press("Escape");
  check(
    (await d.locator("[aria-current='true']").count()) === 0,
    "Esc clears the selection with focus in the tree",
  );

  await d.goto(`${page}#${MSGID}`, { waitUntil: "networkidle" });
  check(
    (await d.locator(sel(MSGID)).count()) === 1,
    "#GrpHdr/MsgId loads selected",
  );

  const t = await open(1280, 900);
  const seen: string[] = [];
  for (let i = 0; i < 12 && !seen.includes("GrpHdr"); i++) {
    await t.keyboard.press("Tab");
    const a = await t.evaluate(() => {
      const e = document.activeElement!;
      return (
        e.getAttribute("data-id") ??
        (e.hasAttribute("aria-expanded") ? "toggle" : "")
      );
    });
    if (a) seen.push(a);
  }
  check(
    seen.join() === "toggle,GrpHdr",
    "Tab reaches the collapse toggle, then the first element",
  );
  await t.keyboard.press("ArrowDown");
  check(
    (await focused(t)) === "GrpHdr/MsgId" &&
      (await t.locator(sel(MSGID)).count()) === 1,
    "ArrowDown moves focus and selection to the next element",
  );
  await t.keyboard.press("Enter");
  check(
    (await t.locator(sel(MSGID)).count()) === 1,
    "Enter keeps/selects the focused element",
  );

  // legend, state markers, tooltip, beginner mode
  const state = (p: Page, path: string) =>
    p.evaluate(
      (q) =>
        document.querySelector(q)!.parentElement!.querySelector(".sr-only")!
          .textContent,
      el(path),
    );
  const l = await open(1280, 900);
  check(
    (
      await l
        .locator("dl[aria-label='Key to the element markers'] dt")
        .allTextContents()
    )
      .map((x) => x.slice(1))
      .join() === "Required,Optional,Choice,Repeats",
    "legend lists the four states",
  );
  check(
    await l.evaluate(() =>
      [...document.querySelectorAll("[data-id]")].every((b) =>
        /^(Required|Optional|Choice)(, Repeats)?$/.test(
          b.parentElement!.querySelector(".sr-only")?.textContent ?? "",
        ),
      ),
    ),
    "every element row names its state in text",
  );
  check(
    (await state(l, MSGID)) === "Required" &&
      (await state(l, "CdtTrfTxInf/PmtId/InstrId")) === "Optional" &&
      (await state(l, "CdtTrfTxInf")) === "Required, Repeats" &&
      (await state(l, "CdtTrfTxInf/DbtrAcct/Id/IBAN")) === "Choice",
    "required, optional, repeating and choice rows read correctly",
  );
  const tip = l.getByRole("tooltip");
  await l.hover(el(MSGID));
  await tip.waitFor({ state: "visible", timeout: 2000 });
  const tipText = await tip.innerText();
  check(
    tipText.includes("MessageIdentification") &&
      tipText.includes("Required") &&
      tipText.startsWith("MessageIdentification") &&
      tipText.includes("The reference the sending bank gives"),
    "hover shows ISO name, state and plain-English first sentence",
  );
  const describedBy = (await l
    .locator(el(MSGID))
    .getAttribute("aria-describedby"))!.split(" ");
  check(
    describedBy.includes((await tip.getAttribute("id"))!) &&
      (await l.locator(`[id="${describedBy[0]}"]`).textContent()) ===
        "Required",
    "tooltip and the state text are linked with aria-describedby",
  );
  const [tb, rb] = [
    (await tip.boundingBox())!,
    (await l.locator(el(MSGID)).boundingBox())!,
  ];
  check(
    tb.y >= rb.y + rb.height || tb.y + tb.height <= rb.y,
    "tooltip does not cover its element",
  );
  await axe(l, "legend and tooltip open");
  await tip.hover();
  await l.waitForTimeout(400);
  check(await tip.isVisible(), "tooltip stays while the pointer is over it");
  await l.keyboard.press("Escape");
  check((await tip.count()) === 0, "Esc hides the tooltip");
  await l.mouse.move(0, 0);
  await l.click(el(MSGID));
  await l.hover(el(MSGID));
  await tip.waitFor({ state: "visible", timeout: 2000 });
  await l.keyboard.press("Escape");
  check(
    (await tip.count()) === 0 && (await l.locator(sel(MSGID)).count()) === 1,
    "Esc on a tooltip hides it but keeps the selection",
  );
  await l.keyboard.press("Escape");
  check(
    (await l.locator("[aria-current='true']").count()) === 0,
    "a second Esc clears the selection",
  );
  // Esc during the show delay dismisses the pending tooltip and keeps the selection
  await l.click(el(MSGID));
  await l.mouse.move(0, 0);
  await l.waitForTimeout(400);
  await l.hover(el("GrpHdr/CreDtTm"));
  await l.keyboard.press("Escape");
  await l.waitForTimeout(600);
  check(
    (await tip.count()) === 0 && (await l.locator(sel(MSGID)).count()) === 1,
    "Esc during the show delay: no tooltip appears and the selection stays",
  );
  await l.locator("header button").first().focus();
  await l.keyboard.press("Escape");
  check(
    (await l.locator(sel(MSGID)).count()) === 1,
    "Esc with focus on the theme toggle leaves the selection",
  );
  await l.mouse.move(0, 0);
  await l.focus(el("GrpHdr/CreDtTm"));
  await tip.waitFor({ state: "visible", timeout: 2000 });
  check(
    (await tip.innerText()).includes("CreationDateTime"),
    "keyboard focus shows the tooltip for the focused element",
  );
  await l.keyboard.press("Escape");
  check((await tip.count()) === 0, "Esc hides the focus tooltip");

  const touch = await (
    await browser.newContext({
      viewport: { width: 390, height: 800 },
      hasTouch: true,
      isMobile: true,
    })
  ).newPage();
  await touch.goto(page, { waitUntil: "networkidle" });
  await touch.tap(el(MSGID));
  await touch.waitForTimeout(600);
  check(
    (await touch.getByRole("tooltip").count()) === 0 &&
      (await touch.locator(sel(MSGID)).count()) === 1,
    "touch: no tooltip, the tap selects",
  );
  check(
    await until(touch.getByRole("tab", { name: "Details", selected: true })),
    "touch: the tap opens the Details tab",
  );

  const rowCount = (p: Page) => p.locator("[data-id]").count();
  const pressed = (p: Page) =>
    p
      .getByRole("button", { name: "Beginner view" })
      .getAttribute("aria-pressed");
  const full = await rowCount(l);
  await l.click(el("CdtTrfTxInf/PmtId/InstrId"));
  await l.getByRole("button", { name: "Beginner view" }).click();
  const beginner = await rowCount(l);
  const note = await l
    .getByRole("region", { name: "Annotated XML" })
    .getByRole("status")
    .innerText();
  check(
    (await pressed(l)) === "true" &&
      beginner < full &&
      note === `${full - beginner} optional elements hidden` &&
      !(await l.evaluate(() =>
        [...document.querySelectorAll("[data-id]")].some((b) =>
          b
            .parentElement!.querySelector(".sr-only")!
            .textContent!.startsWith("Optional"),
        ),
      )),
    "beginner mode hides optional rows and shows the count",
  );
  check(
    (await l.locator(sel("CdtTrfTxInf/PmtId")).count()) === 1,
    "beginner mode moves a hidden selection to its nearest visible ancestor",
  );
  await l.reload({ waitUntil: "networkidle" });
  check((await pressed(l)) === "true", "beginner mode persists across reloads");
  await l.goto(`${page}#CdtTrfTxInf/PmtId/InstrId`, {
    waitUntil: "networkidle",
  });
  // same-document hash change: the mode switches a render after the selection, so poll (false on timeout)
  const full2 = await l
    .getByRole("button", { name: "Beginner view", pressed: false })
    .waitFor({ timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  check(
    full2 &&
      (await pressed(l)) === "false" &&
      (await l.locator(sel("CdtTrfTxInf/PmtId/InstrId")).count()) === 1,
    "a deep link to a hidden element switches to full mode",
  );
  await l.getByRole("button", { name: "Beginner view" }).click();
  await l.getByRole("button", { name: "Beginner view" }).click();
  check(
    (await rowCount(l)) === full,
    "switching back to full restores every row",
  );
  await axe(l, "beginner mode");

  // mobile: XML | Tree | Details tabs, one pane at a time
  const m = await open(390, 800);
  const mAside = m.getByRole("complementary", { name: "Element details" });
  check(
    (await tabState(m)) === "XML:true:0,Tree:false:-1,Details:false:-1" &&
      (await shownPanes(m)) === "xml",
    "mobile: the XML tab is open first and only its pane shows",
  );
  check(
    (await m.getByRole("tablist", { name: "Workspace panes" }).count()) === 1 &&
      (await m.evaluate(() =>
        [...document.querySelectorAll("[role=tab]")].every((t) => {
          const p = document.getElementById(t.getAttribute("aria-controls")!);
          return (
            p?.getAttribute("role") === "tabpanel" &&
            p.getAttribute("aria-labelledby") === t.id
          );
        }),
      )),
    "mobile: each tab controls its pane, a tab panel labelled by that tab",
  );
  await m.click(el(MSGID));
  check(
    (await until(m.getByRole("tab", { name: "Details", selected: true }))) &&
      (await tabState(m)) === "XML:false:-1,Tree:false:-1,Details:true:0" &&
      (await shownPanes(m)) === "details" &&
      (await m.getByRole("tabpanel", { name: "Details" }).isVisible()) &&
      (await mAside.innerText()).includes(ISO) &&
      (await mAside.evaluate((a) => {
        const r = a.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight;
      })),
    "mobile: a click in the XML pane opens the Details tab, with the panel in view",
  );
  check(
    (await m.evaluate(() => document.activeElement?.id)) === "tab-ws-details",
    "mobile: after the switch, focus is on the Details tab",
  );
  await axe(m, "mobile, MsgId selected");
  check(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile: page does not scroll sideways",
  );
  await m.keyboard.press("Escape");
  const mCleared = await m
    .locator(sel(MSGID))
    .waitFor({ state: "detached", timeout: 1000 })
    .then(
      () => true,
      () => false,
    );
  check(
    mCleared &&
      (await tabState(m)) === "XML:false:-1,Tree:false:-1,Details:true:0" &&
      (await mAside.innerText()).includes(
        "Select an element to see what it is.",
      ),
    "mobile: Esc clears the selection and keeps the Details tab",
  );
  const roving: string[] = [];
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowRight"]) {
    await m.keyboard.press(key);
    roving.push(
      await m.evaluate(
        () =>
          `${document.activeElement?.textContent}/${document.querySelector("[role=tab][aria-selected=true]")?.textContent}`,
      ),
    );
  }
  check(
    roving.join() === "Tree/Tree,Details/Details,XML/XML" &&
      (await shownPanes(m)) === "xml",
    "mobile: arrow keys move focus along the tabs and show that pane (roving, wraps)",
  );
  await m
    .locator(el(MSGID))
    .evaluate((e) => e.scrollIntoView({ block: "center" }));
  await m.focus(el(MSGID));
  const y0 = await m.evaluate(() => scrollY);
  await m.keyboard.press("ArrowDown");
  // the hidden tree pane follows the selection: wait for it, then for its scroll frame
  await m
    .locator('[role=treeitem][data-path="GrpHdr/CreDtTm"][aria-selected=true]')
    .waitFor({ state: "attached", timeout: 5000 });
  await frames(m);
  check(
    (await focused(m)) === "GrpHdr/CreDtTm" &&
      (await m.locator(sel("GrpHdr/CreDtTm")).count()) === 1 &&
      (await shownPanes(m)) === "xml" &&
      (await m.evaluate(() => scrollY)) === y0,
    "mobile: arrow keys select in the XML pane, stay on the XML tab and do not scroll the window",
  );
  // a pick far down the page: the Details tab and the top of the panel come into view.
  // Half a pixel above the workspace gives fractional positions, as other font metrics do (CI on Linux).
  await m.addStyleTag({ content: "h1 { margin-top: 0.5px }" });
  // Two readings: the layout at the moment the Details tab becomes selected (a poll can land in any frame,
  // so the switch must already be in view then), and the layout once two frames in a row agree.
  type Layout = Record<string, string | number | undefined>;
  await m.evaluate(() => {
    const w = window as unknown as { layout: () => Layout; atSwitch?: Layout };
    w.layout = () => {
      const bar = document
        .querySelector("[role=tablist]")!
        .getBoundingClientRect();
      const a = document.querySelector("aside")!.getBoundingClientRect();
      return {
        tab:
          document.querySelector("[role=tab][aria-selected=true]")
            ?.textContent ?? "",
        focus: document.activeElement?.id,
        scrollY,
        innerHeight,
        barTop: bar.top,
        barBottom: bar.bottom,
        asideTop: a.top,
        asideBottom: a.bottom,
        fonts: document.fonts.status,
        dpr: devicePixelRatio,
      };
    };
    const t = document.getElementById("tab-ws-details")!;
    const o = new MutationObserver(() => {
      if (t.getAttribute("aria-selected") !== "true") return;
      o.disconnect();
      w.atSwitch = w.layout();
    });
    o.observe(t, { attributes: true, attributeFilter: ["aria-selected"] });
  });
  await m.click(el("CdtTrfTxInf/CdtrAcct/Id/IBAN"));
  const picked = await until(
    m.getByRole("tab", { name: "Details", selected: true }),
  );
  const atSwitch = await m.evaluate(
    () => (window as unknown as { atSwitch?: Layout }).atSwitch,
  );
  // throws when the layout keeps changing for 2s
  const settled = await m.evaluate(
    () =>
      new Promise<Layout>((done, fail) => {
        const w = window as unknown as { layout: () => Layout };
        const end = performance.now() + 2000;
        let last = "";
        const tick = () => {
          const now = w.layout();
          const key = JSON.stringify(now);
          if (key === last) return done(now);
          if (performance.now() > end)
            return fail(new Error(`layout did not settle in 2s: ${key}`));
          last = key;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  const inView = (l?: Layout) =>
    !!l &&
    l.tab === "Details" &&
    l.focus === "tab-ws-details" &&
    (l.barTop as number) >= 0 &&
    (l.asideTop as number) >= (l.barBottom as number) &&
    (l.asideTop as number) < (l.innerHeight as number);
  const farOk = picked && inView(atSwitch) && inView(settled);
  check(
    farOk,
    "mobile: a pick far down the XML pane shows the tab bar and the top of the panel, from the switch on",
  );
  if (!farOk)
    console.log(
      `  picked=${picked}
  at switch: ${JSON.stringify(atSwitch)}
  settled:   ${JSON.stringify(settled)}`,
    );
  // the row is on screen and not under the sticky tab bar
  const onScreen = (q: string) =>
    m.evaluate((q) => {
      const r = document.querySelector(q)!.getBoundingClientRect();
      const bar = document.querySelector("[role=tablist]")!;
      return (
        r.top >= bar.getBoundingClientRect().bottom - 1 &&
        r.bottom <= innerHeight + 1
      );
    }, q);
  const CA = "CdtTrfTxInf/CdtrAcct";
  const tRow = (path: string) =>
    `[role=treeitem][data-path="${path}"][aria-selected='true']`;
  await m.getByRole("tab", { name: "Tree" }).click();
  await frames(m);
  check(
    await onScreen(tRow("CdtTrfTxInf/CdtrAcct/Id/IBAN")),
    "mobile: opening the Tree tab shows the row selected in the XML pane",
  );
  await m.locator(`[role=treeitem][data-path="${CA}"]`).click();
  await until(m.getByRole("tab", { name: "Details", selected: true }));
  await m.getByRole("tab", { name: "XML" }).click();
  await frames(m);
  check(
    await onScreen(sel(CA)),
    "mobile: opening the XML tab shows the row selected in the tree",
  );
  // a row above the window scrolled into view the way reveal does it: it must clear the sticky tab bar
  await m.getByRole("tab", { name: "Tree" }).click();
  await m.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const up = await m.evaluate((q) => {
    const e = document.querySelector(q)!;
    const before = e.getBoundingClientRect().top;
    e.scrollIntoView({ block: "nearest" });
    return before;
  }, '[role=treeitem][data-path="GrpHdr"]');
  check(
    up < 0 && (await onScreen('[role=treeitem][data-path="GrpHdr"]')),
    "mobile: a row scrolled up into view lands below the sticky tab bar",
  );
  const mh = await open(390, 800, `#${MSGID}`);
  check(
    (await until(mh.getByRole("tab", { name: "Details", selected: true }))) &&
      (await shownPanes(mh)) === "details" &&
      (
        await mh
          .getByRole("complementary", { name: "Element details" })
          .innerText()
      ).includes(ISO),
    "mobile: a hash on load opens the Details tab",
  );
  check(
    await mh.evaluate(() => document.activeElement === document.body),
    "mobile: a hash on load does not move focus",
  );
  await mh.setViewportSize({ width: 1280, height: 900 });
  const columns = await mh
    .waitForFunction(() => !document.querySelector("[role=tabpanel]"), null, {
      timeout: 2000,
    })
    .then(
      () => true,
      () => false,
    );
  check(
    columns &&
      !(await mh.getByRole("tablist").isVisible()) &&
      (await shownPanes(mh)) === "xml,tree,details" &&
      (await mh.getByRole("separator").count()) === 2 &&
      (await mh.getByRole("region", { name: "Annotated XML" }).isVisible()),
    "resize up to 1280px: the tab bar hides, the three panes show as columns with separators",
  );
  await mh.setViewportSize({ width: 390, height: 800 });
  const tabsBack = await mh
    .waitForFunction(
      () => document.querySelectorAll("[role=tabpanel]").length === 3,
      null,
      { timeout: 2000 },
    )
    .then(
      () => true,
      () => false,
    );
  check(
    tabsBack &&
      (await mh.getByRole("tablist").isVisible()) &&
      (await tabState(mh)) === "XML:false:-1,Tree:false:-1,Details:true:0" &&
      (await shownPanes(mh)) === "details",
    "resize back down: the tab bar comes back on the same tab",
  );

  // separators (1280px and up): keyboard, limits, drag, measured pane widths
  const s = await open(1280, 900);
  const s1 = s.getByRole("separator", {
    name: "Resize the annotated XML and the schema tree",
  });
  const s2 = s.getByRole("separator", {
    name: "Resize the schema tree and the element details",
  });
  const aria = (l: Locator) =>
    l.evaluate((e) =>
      [
        "aria-valuenow",
        "aria-valuemin",
        "aria-valuemax",
        "aria-orientation",
        "tabindex",
      ]
        .map((a) => e.getAttribute(a))
        .join(),
    );
  const now = (l: Locator) => l.getAttribute("aria-valuenow");
  check(
    (await s.getByRole("separator").count()) === 2 &&
      (await aria(s1)) === "36,20,52,vertical,0" &&
      (await aria(s2)) === "72,56,80,vertical,0",
    "two vertical, focusable separators with value and limits in percent",
  );
  const text = (l: Locator) => l.getAttribute("aria-valuetext");
  check(
    (await text(s1)) === "XML 36 %, Tree 36 %" &&
      (await text(s2)) === "Tree 36 %, Details 28 %",
    "each separator's value text names both pane widths",
  );
  const w0 = await widths(s);
  const g = w0.grid;
  check(
    near(w0.xml, g * 0.36 - 12) &&
      near(w0.tree, g * 0.36 - 24) &&
      near(w0.details, g * 0.28 - 12),
    "pane widths follow the separator positions (measured)",
  );
  await s1.focus();
  await s.keyboard.press("ArrowRight");
  const w1 = await widths(s);
  check(
    (await now(s1)) === "38" &&
      (await text(s1)) === "XML 38 %, Tree 34 %" &&
      near(w1.xml - w0.xml, g * 0.02) &&
      near(w0.tree - w1.tree, g * 0.02) &&
      near(w1.details, w0.details),
    "ArrowRight moves the first separator 2 %: the XML pane grows and the tree shrinks by that many pixels",
  );
  await s.keyboard.press("Shift+ArrowLeft");
  check(
    (await now(s1)) === "28" && near((await widths(s)).xml, g * 0.28 - 12),
    "Shift+ArrowLeft moves it 10 % (measured)",
  );
  await s.keyboard.press("Home");
  await s.keyboard.press("ArrowLeft");
  check(
    (await now(s1)) === "20" && near((await widths(s)).xml, g * 0.2 - 12),
    "Home goes to the lower limit and it holds: the XML pane stays at 20 % (measured)",
  );
  await s.keyboard.press("End");
  await s.keyboard.press("ArrowRight");
  check(
    (await now(s1)) === "52" && near((await widths(s)).tree, g * 0.2 - 24),
    "End goes to the upper limit and it holds: the tree keeps 20 % (measured)",
  );
  await s2.focus();
  await s.keyboard.press("End");
  await s.keyboard.press("ArrowRight");
  check(
    (await aria(s2)) === "80,72,80,vertical,0" &&
      (await s1.getAttribute("aria-valuemax")) === "60" &&
      near((await widths(s)).details, g * 0.2 - 12),
    "the second separator stops at 20 % for the details and widens the first one's range",
  );
  const left = (await s.locator("#panel-ws-xml").boundingBox())!.x;
  const drag = async (toX: number) => {
    const b = (await s1.boundingBox())!;
    await s.mouse.move(b.x + b.width / 2, b.y + 100);
    await s.mouse.down();
    await s.mouse.move(toX, b.y + 100, { steps: 4 });
    await s.mouse.up();
    // released: moving over the separator again changes nothing (10px would be about 1 %)
    const after = (await s1.boundingBox())!;
    await s.mouse.move(after.x + after.width / 2 - 10, after.y + 100);
  };
  await drag(left + g * 0.4);
  check(
    (await now(s1)) === "40" && near((await widths(s)).xml, g * 0.4 - 12),
    "dragging the separator moves it to the pointer and stops on release (measured)",
  );
  await drag(left + 5);
  check(
    (await now(s1)) === "20" && near((await widths(s)).xml, g * 0.2 - 12),
    "dragging past the limit stops at 20 % (measured)",
  );
  // lost capture (as on pointercancel) ends the drag, even with the button still down
  const c = (await s1.boundingBox())!;
  await s.mouse.move(c.x + c.width / 2, c.y + 100);
  await s.mouse.down();
  // headless Chromium does not fire it for a scripted releasePointerCapture, so send the event itself
  await s1.evaluate((e) =>
    e.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 1 })),
  );
  await s.mouse.move(c.x + c.width / 2 + 10, c.y + 100);
  await s.mouse.up();
  check(
    (await now(s1)) === "20",
    "after the pointer capture is lost, moving over the separator does not resize",
  );

  // 1280px: a selection scrolls the other pane inside itself, never the window
  const j = await open(1280, 900);
  const inPane = (q: string) =>
    j.evaluate((q) => {
      const e = document.querySelector(q)!;
      const r = e.getBoundingClientRect();
      const p = e.closest("[data-pane]")!.getBoundingClientRect();
      // the part of the pane that is on screen
      return (
        r.top >= Math.max(p.top, 0) - 1 &&
        r.bottom <= Math.min(p.bottom, innerHeight) + 1
      );
    }, q);
  // a script click: Playwright's own click would first scroll the target into view
  const jClick = (q: string) =>
    j.evaluate((q) => (document.querySelector(q) as HTMLElement).click(), q);
  const IBAN = "CdtTrfTxInf/CdtrAcct/Id/IBAN";
  const tIban = `[role=treeitem][data-path="${IBAN}"][aria-selected='true']`;
  await jClick(el(IBAN));
  await j.locator(tIban).waitFor({ timeout: 5000 });
  await frames(j);
  check(
    (await j.evaluate(() => scrollY)) === 0 && (await inPane(tIban)),
    "1280px: selecting in the XML pane scrolls the tree pane to the row, not the window",
  );
  await j.locator("#panel-ws-xml").evaluate((e) => (e.scrollTop = 0));
  const DA = "CdtTrfTxInf/DbtrAgt"; // low in the XML pane, but within its reach
  await jClick(`[role=treeitem][data-path="${DA}"]`);
  await j.locator(sel(DA)).waitFor({ timeout: 3000 });
  await frames(j);
  check(
    (await j.evaluate(() => scrollY)) === 0 &&
      (await j.locator("#panel-ws-xml").evaluate((e) => e.scrollTop)) > 0 &&
      (await inPane(sel(DA))),
    "1280px: selecting in the tree scrolls the XML pane to the row, not the window",
  );
  // a short window: the sticky panes run past the fold, the rows must still land on screen
  const shortLink = async (path: string) => {
    const p = await open(1280, 720, `#${path}`);
    await p
      .locator(`[role=treeitem][data-path="${path}"][aria-selected='true']`)
      .waitFor({ timeout: 5000 });
    await frames(p);
    return p.evaluate(
      (qs) => ({
        y: scrollY,
        rows: qs.map((q) => {
          const r = document.querySelector(q)!.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, h: innerHeight };
        }),
      }),
      [`[role=treeitem][data-path="${path}"]`, el(path)],
    );
  };
  const onWin = (r: { top: number; bottom: number; h: number }) =>
    r.top >= 0 && r.bottom <= r.h + 1;
  const low = await shortLink("CdtTrfTxInf/DbtrAcct/Id/IBAN");
  check(
    low.y === 0 && low.rows.every(onWin),
    "1280x720: a deep link to a low row shows it on screen in both panes, without moving the window",
  );
  // the last rows: the XML pane cannot scroll far enough, so the window moves just enough
  const last = await shortLink(IBAN);
  check(
    last.y > 0 &&
      last.rows.every(onWin) &&
      Math.abs(last.rows[1]!.bottom - last.rows[1]!.h) <= 1,
    "1280x720: a row the pane cannot bring on screen moves the window just enough",
  );

  // cross-pane: one selection drives the XML pane, the tree and the panel
  const x = await open(1280, 900);
  const treeSel = (path: string) =>
    `[role=treeitem][data-path="${path}"][aria-selected='true']`;
  const xAside = x.getByRole("complementary", { name: "Element details" });
  await x.click(el(MSGID));
  await x.locator(treeSel(MSGID)).waitFor({ timeout: 5000 });
  check(
    (await x.locator("[role=treeitem][aria-selected='true']").count()) === 1 &&
      (await xAside.innerText()).includes(ISO) &&
      (await x.evaluate(() => location.hash)) === `#${MSGID}`,
    "XML pane: selecting MsgId marks it in the tree and shows it in the panel",
  );
  const PMT = "CdtTrfTxInf/PmtId";
  await x
    .locator('[role=treeitem][data-path="CdtTrfTxInf"]')
    .getByText("▸", { exact: true })
    .click();
  await x.locator(`[role=treeitem][data-path="${PMT}"]`).click();
  await x.locator(sel(PMT)).waitFor({ timeout: 3000 });
  check(
    (await x.locator("[aria-current='true']").count()) === 1 &&
      (await xAside.innerText()).includes("PaymentIdentification") &&
      (await x.locator(treeSel(MSGID)).count()) === 0,
    "tree pane: selecting PmtId marks it in the XML pane and shows it in the panel",
  );

  // leaving the XML pane and coming back: the XML pane must open, unhide and mark the row again
  const INSTR = "CdtTrfTxInf/PmtId/InstrId"; // optional, in the sample
  const XPRY = "GrpHdr/XpryDtTm"; // not in the sample
  const b = await open(1280, 900);
  await b.click(el(INSTR));
  await b
    .locator('[role=treeitem][data-path="GrpHdr"]')
    .getByText("▸", { exact: true })
    .click();
  await b.locator(`[role=treeitem][data-path="${XPRY}"]`).click();
  await b.locator(treeSel(XPRY)).waitFor({ timeout: 3000 });
  await b.getByRole("button", { name: "Beginner view" }).click();
  await b.locator(`[role=treeitem][data-path="${INSTR}"]`).click();
  const back = await b
    .getByRole("button", { name: "Beginner view", pressed: false })
    .waitFor({ timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  check(
    back && (await b.locator(sel(INSTR)).count()) === 1,
    "back to an element the XML pane had selected: it leaves beginner view and marks the row",
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
