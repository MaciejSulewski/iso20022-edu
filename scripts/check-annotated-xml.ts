// Browser check for the XML pane of the workspace page: click, deep link, keyboard, tooltip, beginner mode,
// cross-pane selection and axe.
// Needs a built dist (npm run build).
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";
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
// The mobile sheet is gone from the workspace page; Task 2 of T-051 replaces these with tab checks.
const skip = (what: string) =>
  console.log(`skip ${what} (no sheet on the workspace page, T-051 task 2)`);
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
    "Esc clears the selection with focus in the aside",
  );
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
  skip("touch: the tap opens the sheet");

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
    .waitForFunction(
      () =>
        document
          .querySelector("[aria-pressed]")
          ?.getAttribute("aria-pressed") === "false",
      null,
      { timeout: 2000 },
    )
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

  // mobile: the panes stack, the panel sits below them (tabs come in T-051 task 2)
  const m = await open(390, 800);
  await m.click(el(MSGID));
  check(
    (
      await m
        .getByRole("complementary", { name: "Element details" })
        .innerText()
    ).includes(ISO),
    "mobile: click shows the ISO definition in the panel",
  );
  skip("mobile: click opens a visible sheet in the viewport");
  skip("mobile: sheet label points at the element name");
  await axe(m, "mobile, MsgId selected");
  skip("mobile: Esc closes the sheet");
  skip("mobile: focus returns to the element");
  check(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile: page does not scroll sideways",
  );
  await m.focus(el(MSGID));
  await m.keyboard.press("ArrowDown");
  check(
    (await focused(m)) === "GrpHdr/CreDtTm" &&
      (await m.locator(sel("GrpHdr/CreDtTm")).count()) === 1,
    "mobile: arrow keys select",
  );
  skip("mobile: deep link opens the sheet");
  skip("mobile: deep link, focus returns to the element after Esc");
  skip("resize up closes the sheet");
  skip("resize back down does not pop the sheet");

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
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
