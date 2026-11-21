// Browser check for the annotated XML page: click, deep link, keyboard and the mobile sheet.
// Needs a built dist (npm run build).
import { chromium } from "playwright";
import { serveDist } from "./serve-dist.ts";

const { server, url } = await serveDist();
const page = `${url}messages/pacs.008.001.14/`;
const el = (path: string) => `[data-id="${path}"]`;
const panel = "aside[aria-label='Element details']";
const ISO = "Point to point reference, as assigned by the instructing party";

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};

try {
  // desktop
  const d = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  await d.goto(page, { waitUntil: "networkidle" });
  await d.click(el("GrpHdr/MsgId"));
  const text = await d.locator(panel).innerText();
  check(text.includes(ISO), "click on MsgId shows the ISO definition");
  check(
    (await d.locator(panel).getAttribute("aria-label")) === "Element details",
    "panel region is labelled",
  );
  check(
    (await d.locator("[aria-live] h2").innerText()) === "MessageIdentification",
    "live title names the element",
  );
  await d.keyboard.press("Escape");
  check(
    (await d.locator(`${el("GrpHdr/MsgId")}[aria-current]`).count()) === 0,
    "Esc clears the selection on desktop",
  );

  await d.goto(`${page}#GrpHdr/MsgId`, { waitUntil: "networkidle" });
  check(
    (await d.locator(`${el("GrpHdr/MsgId")}[aria-current='true']`).count()) ===
      1,
    "#GrpHdr/MsgId loads selected",
  );

  await d.goto(page, { waitUntil: "networkidle" });
  await d.focus(el("GrpHdr/MsgId"));
  await d.keyboard.press("Enter");
  check(
    (await d.locator(`${el("GrpHdr/MsgId")}[aria-current='true']`).count()) ===
      1,
    "Enter selects the focused element",
  );
  await d.keyboard.press("ArrowDown");
  const next = await d.evaluate(() =>
    document.activeElement?.getAttribute("data-id"),
  );
  check(
    next === "GrpHdr/CreDtTm" &&
      (await d.locator(`${el(next)}[aria-current='true']`).count()) === 1,
    "ArrowDown moves focus and selection to the next element",
  );
  await d.keyboard.press("Shift+Tab");
  const tabbed = await d.evaluate(() => document.activeElement?.tagName);
  check(tabbed === "BUTTON", "Tab order reaches buttons");

  // mobile
  const m = await (
    await browser.newContext({ viewport: { width: 390, height: 800 } })
  ).newPage();
  await m.goto(page, { waitUntil: "networkidle" });
  await m.click(el("GrpHdr/MsgId"));
  await m
    .locator("dialog[open]")
    .waitFor({ timeout: 3000 })
    .catch(() => {});
  check(
    (await m.locator("dialog[open]").count()) === 1,
    "mobile: click opens the sheet",
  );
  check(
    (await m.locator("dialog[open]").innerText()).includes(ISO),
    "mobile: sheet shows the ISO definition",
  );
  check(
    (await m.locator("dialog[open]").getAttribute("aria-labelledby")) !== null,
    "mobile: sheet is labelled",
  );
  await m.keyboard.press("Escape");
  check(
    (await m.locator("dialog[open]").count()) === 0,
    "mobile: Esc closes the sheet",
  );
  check(
    (await m.evaluate(() =>
      document.activeElement?.getAttribute("data-id"),
    )) === "GrpHdr/MsgId",
    "mobile: focus returns to the element",
  );
  check(
    (await m.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    )) === true,
    "mobile: page does not scroll sideways",
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
