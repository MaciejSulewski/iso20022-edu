// Browser check for the annotated XML page: click, deep link, keyboard, the mobile sheet and axe.
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
const open = async (width: number, height: number, hash = "") => {
  const p = await (
    await browser.newContext({ viewport: { width, height } })
  ).newPage();
  await p.goto(page + hash, { waitUntil: "networkidle" });
  return p;
};
// The sheet must really be on screen: visible, inside the viewport and on top.
async function sheetShown(p: Page) {
  const dialog = p.locator("dialog[open]");
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  const box = (await dialog.boundingBox())!;
  const vh = p.viewportSize()!.height;
  const top = await p.evaluate(
    ([x, y]) => !!document.elementFromPoint(x!, y!)?.closest("dialog[open]"),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  return box.height > 0 && box.y + box.height <= vh + 0.5 && top;
}
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
  await d.keyboard.press("Escape");
  check(
    (await d.locator("[aria-current='true']").count()) === 0,
    "Esc clears the selection with focus in the aside",
  );
  await d.click(el(MSGID));
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

  // mobile
  const m = await open(390, 800);
  await m.click(el(MSGID));
  check(
    await sheetShown(m),
    "mobile: click opens a visible sheet in the viewport",
  );
  const dialog = m.locator("dialog[open]");
  check(
    (await dialog.innerText()).includes(ISO),
    "mobile: sheet shows the ISO definition",
  );
  const label = await m.evaluate(() => {
    const d = document.querySelector("dialog[open]")!;
    return (
      document.getElementById(d.getAttribute("aria-labelledby")!)
        ?.textContent ?? ""
    );
  });
  check(
    label === "MessageIdentification",
    "mobile: sheet label points at the element name",
  );
  await axe(m, "mobile sheet, MsgId selected");
  await m.keyboard.press("Escape");
  check(
    (await m.locator("dialog[open]").count()) === 0,
    "mobile: Esc closes the sheet",
  );
  check((await focused(m)) === MSGID, "mobile: focus returns to the element");
  check(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile: page does not scroll sideways",
  );
  await m.keyboard.press("ArrowDown");
  check(
    (await focused(m)) === "GrpHdr/CreDtTm" &&
      (await m.locator("dialog[open]").count()) === 0,
    "mobile: arrow keys select without opening the sheet",
  );

  const dl = await open(390, 800, `#${MSGID}`);
  check(await sheetShown(dl), "mobile: deep link opens the sheet");
  await dl.keyboard.press("Escape");
  check(
    (await focused(dl)) === MSGID,
    "mobile: deep link, focus returns to the element after Esc",
  );

  const r = await open(390, 800);
  await r.click(el(MSGID));
  await r.locator("dialog[open]").waitFor({ state: "visible" });
  await r.setViewportSize({ width: 1280, height: 900 });
  await r.locator("aside").waitFor({ state: "visible" });
  check(
    (await r.locator("dialog[open]").count()) === 0,
    "resize up closes the sheet",
  );
  await r.setViewportSize({ width: 390, height: 800 });
  await r.waitForTimeout(300);
  check(
    (await r.locator("dialog[open]").count()) === 0,
    "resize back down does not pop the sheet",
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
