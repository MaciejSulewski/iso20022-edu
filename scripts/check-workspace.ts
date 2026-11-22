// Browser check for what the panes do together: selection round trips, search picks, the required-only rule
// and a clean console. The sample has no repeated element, so repeats are covered by the unit test in
// src/lib/workspace.test.ts. Needs a built dist (npm run build).
import { chromium, type Locator, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";

const { server, url } = await serveDist();
const page = `${url}messages/pacs.008.001.14/`;
const xml = (path: string) => `[data-id="${path}"][aria-current='true']`;
const tree = (path: string) =>
  `[role=treeitem][data-path="${path}"][aria-selected='true']`;
const TX = "CdtTrfTxInf";
const E2E = `${TX}/PmtId/EndToEndId`;
const INSTR = `${TX}/PmtId/InstrId`;
const MSGID = "GrpHdr/MsgId";
const BIC = "GrpHdr/InstgAgt/FinInstnId/BICFI"; // not in the sample

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
// false on timeout, so a missing state fails its check instead of aborting the run
const there = (l: Locator, ms = 3000) =>
  l.waitFor({ timeout: ms }).then(
    () => true,
    () => false,
  );
const title = (p: Page, text: string) =>
  p
    .waitForFunction(
      (t) => document.querySelector("[aria-live] h2")?.textContent === t,
      text,
      { timeout: 3000 },
    )
    .then(
      () => true,
      () => false,
    );
const hash = (p: Page) => p.evaluate(() => location.hash);
// Fresh page that collects console errors and uncaught page errors.
async function open(width: number, height: number) {
  const p = await (
    await browser.newContext({ viewport: { width, height } })
  ).newPage();
  const errors: string[] = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(page, { waitUntil: "networkidle" });
  return Object.assign(p, { errors });
}
const search = async (p: Page, term: string, path: string) => {
  await p.getByLabel("Find an element").fill(term);
  await p
    .getByRole("list", { name: "Search results" })
    .locator("button", { has: p.getByText(path, { exact: true }) })
    .click();
};
const required = (p: Page) => p.getByRole("button", { name: "Required only" });

try {
  const d = await open(1280, 900);

  // round trip, a path in the sample: XML -> tree -> panel, then tree -> XML, then XML again
  await d.click(`[data-id="${E2E}"]`);
  check(
    (await there(d.locator(tree(E2E)))) &&
      (await title(d, "EndToEndIdentification")) &&
      (await hash(d)) === `#${E2E}`,
    "round trip, in the sample: an XML click marks the tree and fills the panel",
  );
  await d.locator(`[role=treeitem][data-path="${INSTR}"]`).click();
  check(
    (await there(d.locator(xml(INSTR)))) &&
      (await title(d, "InstructionIdentification")) &&
      (await d.locator(xml(E2E)).count()) === 0 &&
      (await d.locator(tree(E2E)).count()) === 0,
    "round trip, in the sample: a tree click marks the XML and moves the panel and the old marks",
  );
  await d.click(`[data-id="${E2E}"]`);
  check(
    (await there(d.locator(tree(E2E)))) &&
      (await title(d, "EndToEndIdentification")) &&
      (await d.locator(tree(INSTR)).count()) === 0 &&
      (await d.locator(xml(INSTR)).count()) === 0,
    "round trip, in the sample: back in the XML, the tree and panel follow",
  );

  // round trip, a path not in the sample
  await d.goto(`${page}#${BIC}`, { waitUntil: "networkidle" });
  check(
    (await there(d.locator(tree(BIC)))) &&
      (await title(d, "BICFI")) &&
      (await d.locator("[aria-current='true']").count()) === 0,
    "round trip, not in the sample: the tree and panel show it and the XML marks nothing",
  );
  await d.click(`[data-id="${MSGID}"]`);
  check(
    (await there(d.locator(tree(MSGID)))) &&
      (await title(d, "MessageIdentification")) &&
      (await d.locator(xml(MSGID)).count()) === 1 &&
      (await d.locator(tree(BIC)).count()) === 0 &&
      (await hash(d)) === `#${MSGID}`,
    "round trip, not in the sample: an XML click takes the marks, panel and hash back",
  );

  // a search pick updates the XML pane only when the path exists there
  await search(d, "InstructionIdentification", INSTR);
  check(
    (await there(d.locator(xml(INSTR)))) &&
      (await d.locator(tree(INSTR)).count()) === 1 &&
      (await title(d, "InstructionIdentification")),
    "search pick of a path in the sample marks it in the XML pane",
  );
  await search(d, "InstructingAgent", "GrpHdr/InstgAgt");
  check(
    (await there(d.locator(tree("GrpHdr/InstgAgt")))) &&
      (await d.locator("[aria-current='true']").count()) === 0,
    "search pick of a path not in the sample leaves nothing marked in the XML pane",
  );

  // required-only, rule 1: turning it on while the selection is optional moves the selection
  // to the nearest required ancestor (PmtId here); an optional top-level element would clear it
  await d.click(`[data-id="${INSTR}"]`);
  await there(d.locator(tree(INSTR)));
  await required(d).click();
  check(
    (await there(d.locator(tree(`${TX}/PmtId`)))) &&
      (await d.locator(xml(`${TX}/PmtId`)).count()) === 1 &&
      (await d.locator(xml(INSTR)).count()) === 0 &&
      (await title(d, "PaymentIdentification")),
    "required only on with an optional selection: it moves to the nearest required ancestor in all panes",
  );
  // rule 2: selecting an element the filter hides turns the filter off
  check(
    (await required(d).getAttribute("aria-pressed")) === "true" &&
      (await d.locator(`[role=treeitem][data-path="${INSTR}"]`).count()) === 0,
    "required only is on and hides the optional InstrId",
  );
  await d.click(`[data-id="${INSTR}"]`);
  check(
    (await there(d.locator(tree(INSTR)))) &&
      (await required(d).getAttribute("aria-pressed")) === "false",
    "selecting a row the filter hides, from the XML pane, turns required only off",
  );
  check(
    d.errors.length === 0,
    `no console or page errors at 1280 (${d.errors.join(" | ")})`,
  );

  // a full flow at 390: tabs, picks, filter, Esc
  const m = await open(390, 800);
  await m.click(`[data-id="${E2E}"]`);
  check(
    await there(m.getByRole("tab", { name: "Details", selected: true })),
    "mobile: an XML pick opens Details",
  );
  await m.getByRole("tab", { name: "Tree" }).click();
  check(
    await there(m.locator(tree(E2E))),
    "mobile: the Tree tab shows the XML selection",
  );
  await required(m).click();
  await search(m, "InstructingAgent", "GrpHdr/InstgAgt");
  check(
    await there(m.getByRole("tab", { name: "Details", selected: true })),
    "mobile: a search pick opens Details",
  );
  await m.getByRole("tab", { name: "XML" }).click();
  check(
    (await m.locator("[aria-current='true']").count()) === 0,
    "mobile: a search pick of a path not in the sample leaves the XML pane unmarked",
  );
  await m.click(`[data-id="${INSTR}"]`);
  const marked = await m
    .locator(xml(INSTR))
    .waitFor({ state: "attached", timeout: 3000 })
    .then(
      () => true,
      () => false,
    ); // the XML pane is hidden on the Details tab
  await m.keyboard.press("Escape");
  await m.keyboard.press("Escape"); // the first Esc may only dismiss the click's tooltip
  check(
    marked &&
      (await m
        .locator(xml(INSTR))
        .waitFor({ state: "detached", timeout: 2000 })
        .then(
          () => true,
          () => false,
        )),
    "mobile: Esc clears the selection",
  );
  check(
    m.errors.length === 0,
    `no console or page errors at 390 (${m.errors.join(" | ")})`,
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
