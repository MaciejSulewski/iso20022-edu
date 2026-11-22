// Browser check for the tree pane of the workspace page: lazy loading, search, filter, deep links, races, keyboard.
// Needs a built dist (npm run build).
import { chromium, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const page = `${url}messages/pacs.008.001.14/`;
const row = (path: string) => `[role=treeitem][data-path="${path}"]`;
const sel = (path: string) => `${row(path)}[aria-selected='true']`;
const HDR = "GrpHdr";
const TX = "CdtTrfTxInf";
const BIC = "GrpHdr/InstgAgt/FinInstnId/BICFI"; // InstgAgt is not in the sample XML
const GH = "GroupHeader131";
const TXT = "CreditTransferTransaction73";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
// Fresh page that records every type-file request (by type name, in order).
async function open(width: number, height: number, hash = "") {
  const p = await (
    await browser.newContext({ viewport: { width, height } })
  ).newPage();
  await throttle(p);
  const typeReqs: string[] = [];
  p.on("request", (r) => {
    const m = /\/types\/([^/]+)\.json$/.exec(r.url());
    if (m) typeReqs.push(m[1]!);
  });
  await p.goto(page + hash, { waitUntil: "networkidle" });
  return Object.assign(p, { typeReqs });
}
const expanded = (p: Page, path: string) =>
  p.locator(row(path)).getAttribute("aria-expanded");
const hash = (p: Page) => p.evaluate(() => location.hash);
const chevron = (p: Page, path: string) =>
  p.locator(row(path)).getByText("▸", { exact: true });
const aside = (p: Page) =>
  p.getByRole("complementary", { name: "Element details" });
// Polls, so a late focus move is not read too early; throws on timeout.
const focusIs = (p: Page, path: string) =>
  p
    .waitForFunction(
      (x) => (document.activeElement as HTMLElement).dataset.path === x,
      path,
      { timeout: 3000 },
    )
    .then(() => true);
// Rejects when the promise does not settle in time, so a wrong pattern fails fast instead of hanging.
const within = <T>(pr: Promise<T>, ms: number, what: string) =>
  Promise.race([
    pr,
    new Promise<never>((_, no) =>
      setTimeout(() => no(new Error(`timed out waiting for ${what}`)), ms),
    ),
  ]);
// A page opened on a deep link while one type file is held back; resolves once the page is hydrated and loading.
async function slowDeepLink(file: string, ms: number, hashPart: string) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const p = await ctx.newPage();
  const re = new RegExp(`/types/${file}\\.json$`);
  const released = new Promise<void>((done) => {
    void p.route(re, async (r) => {
      await sleep(ms);
      await r.continue();
      done();
    });
  });
  const asked = p.waitForRequest(new RegExp(`/types/${file}\\.json$`));
  await p.goto(page + hashPart, { waitUntil: "domcontentloaded" });
  await asked; // the island is hydrated and the deep link is waiting on the file
  return { p, released: within(released, ms + 5000, "the delayed file") };
}

try {
  // lazy loading: counted requests
  const d = await open(1280, 900);
  check(d.typeReqs.length === 0, "first load fetches no type file");
  check(
    (await d.locator("[role=treeitem]").count()) > 0 &&
      (await d.locator(row(`${HDR}/MsgId`)).count()) === 0,
    "first load shows only the root children",
  );
  const got = d.waitForResponse(new RegExp(`/types/${GH}\\.json$`), {
    timeout: 5000,
  });
  await chevron(d, HDR).click();
  await got;
  await d.locator(row(`${HDR}/MsgId`)).waitFor({ timeout: 3000 });
  check(
    d.typeReqs.join() === GH && (await expanded(d, HDR)) === "true",
    "expanding GrpHdr fetches exactly its type file",
  );
  await d.locator(row(HDR)).getByText("▾", { exact: true }).click();
  await chevron(d, HDR).click();
  await d.locator(row(`${HDR}/MsgId`)).waitFor({ timeout: 3000 });
  check(
    d.typeReqs.join() === GH,
    "collapsing and reopening does not fetch again",
  );

  // mandatory-only filter (GrpHdr is open)
  const required = d.getByRole("button", { name: "Required only" });
  check(
    (await d.locator(row(`${HDR}/XpryDtTm`)).count()) === 1,
    "full view shows the optional ExpiryDateTime",
  );
  await required.click();
  check(
    (await required.getAttribute("aria-pressed")) === "true" &&
      (await d.locator(row(`${HDR}/XpryDtTm`)).count()) === 0 &&
      (await d.locator(row(`${HDR}/MsgId`)).count()) === 1,
    "required only hides an optional element and keeps a mandatory one",
  );
  await required.click();
  check(
    (await d.locator(row(`${HDR}/XpryDtTm`)).count()) === 1,
    "turning required only off brings the optional element back",
  );

  // search by ISO name, then a node that is absent from the sample
  const box = d.getByLabel("Find an element");
  await box.fill("InstructingAgent");
  const results = d.getByRole("list", { name: "Search results" });
  const hit = (path: string) =>
    results.locator("button", { has: d.getByText(path, { exact: true }) });
  await hit(`${HDR}/InstgAgt`).click();
  await d.locator(sel(`${HDR}/InstgAgt`)).waitFor({ timeout: 3000 });
  await settle(
    d,
    "the panel shows the picked element (its record lands a render after the row)",
    () => document.querySelector("aside")?.textContent ?? "",
    (t) => t.includes("Agent that instructs the next"),
  );
  check(
    (await expanded(d, HDR)) === "true" &&
      (await focusIs(d, `${HDR}/InstgAgt`)) &&
      (await hash(d)) === `#${HDR}/InstgAgt` &&
      (await aside(d).innerText()).includes("Agent that instructs the next"),
    "search by ISO name, picking the result selects the element, focuses it and shows the panel",
  );
  // shared-type overlay: two agent elements with no byPath entry show the same byType text
  const SHARED = "A block that identifies a bank and, if needed";
  await chevron(d, TX).click();
  const agents = {
    IntrmyAgt1: "IntermediaryAgent1",
    PrvsInstgAgt1: "PreviousInstructingAgent1",
  };
  for (const [a, name] of Object.entries(agents)) {
    await d.locator(row(`${TX}/${a}`)).click();
    await settle(
      d,
      `${a} in the tree pane shows its own name and the shared-type explanation`,
      () => document.querySelector("aside")?.textContent ?? "",
      (t) => t.startsWith(name) && t.includes(SHARED),
    );
  }
  const before = d.typeReqs.length;
  await box.fill(BIC);
  await hit(BIC).click();
  await d.locator(sel(BIC)).waitFor({ timeout: 5000 });
  check(
    d.typeReqs.length > before &&
      (await expanded(d, "GrpHdr/InstgAgt/FinInstnId")) === "true" &&
      (await aside(d)
        .getByRole("heading", { name: "BICFI" })
        .waitFor({ timeout: 2000 })
        .then(
          () => true,
          () => false,
        )), // the record lands a render after the row: poll
    "an element absent from the sample is found, expanded to and selected",
  );
  check(
    (await d.getByLabel("Find an element").inputValue()) === "",
    "picking a result clears the search box",
  );

  // deep link
  const dl = await open(1280, 900, `#${TX}/PmtId`);
  await dl.locator(sel(`${TX}/PmtId`)).waitFor({ timeout: 5000 });
  await settle(
    dl,
    "the panel shows the deep-linked element",
    () => document.querySelector("aside")?.textContent ?? "",
    (t) => t.includes("PaymentIdentification"),
  );
  check(
    (await expanded(dl, TX)) === "true" &&
      dl.typeReqs.join() === `${TXT}` &&
      (await aside(dl).innerText()).includes("PaymentIdentification"),
    "a #path deep link opens at the node, fetches only the needed file and shows the panel",
  );
  const nope = await open(1280, 900, "#Nope/Thing");
  check(
    (await nope.locator("[role=treeitem][aria-selected='true']").count()) ===
      0 && (await nope.getByText("This branch did not load.").count()) === 0,
    "an unknown deep link selects nothing and shows no error",
  );
  await nope.evaluate((h) => (location.hash = h), `#${HDR}/MsgId`);
  await nope.locator(sel(`${HDR}/MsgId`)).waitFor({ timeout: 5000 });
  check(
    (await nope.locator("[role=treeitem][aria-selected='true']").count()) === 1,
    "after an unknown link the hash listener still opens a valid one",
  );

  // keyboard
  const k = await open(1280, 900);
  await k.locator(row(HDR)).focus();
  await k.keyboard.press("ArrowDown");
  check(await focusIs(k, TX), "ArrowDown moves focus to the next row");
  const kgot = k.waitForResponse(new RegExp(`/types/${TXT}\\.json$`), {
    timeout: 5000,
  });
  await k.keyboard.press("ArrowRight");
  await kgot;
  await k.locator(row(`${TX}/PmtId`)).waitFor({ timeout: 3000 });
  check(
    (await expanded(k, TX)) === "true" && k.typeReqs.join() === TXT,
    "ArrowRight expands the row and fetches exactly its type file",
  );
  await k.keyboard.press("ArrowRight");
  check(await focusIs(k, `${TX}/PmtId`), "ArrowRight enters the branch");
  await k.keyboard.press("Enter");
  await k.locator(sel(`${TX}/PmtId`)).waitFor({ timeout: 3000 });
  check(
    (await k.locator(sel(`${TX}/PmtId`)).count()) === 1 &&
      (await hash(k)) === `#${TX}/PmtId`,
    "Enter selects the focused row and writes the hash",
  );
  await k.keyboard.press("ArrowLeft");
  check(await focusIs(k, TX), "ArrowLeft goes to the parent row");

  // mobile: XML | Tree | Details tabs
  const m = await open(390, 800);
  const sideways: boolean[] = [];
  for (const name of ["Tree", "Details", "XML"]) {
    await m.getByRole("tab", { name }).click();
    const v = await settle(
      m,
      `mobile: the ${name} tab is selected and the page fits the width`,
      () => ({
        tab: document.querySelector("[role=tab][aria-selected=true]")
          ?.textContent,
        fits: document.documentElement.scrollWidth <= innerWidth,
      }),
      (v) => v.tab === name,
    );
    sideways.push(v?.fits ?? false);
  }
  check(
    sideways.every(Boolean),
    "mobile: page does not scroll sideways on any tab",
  );
  // the Details tab, its panel text and where focus is, as the page shows them
  const details = () => ({
    tab: document.querySelector("[role=tab][aria-selected=true]")?.textContent,
    asideShown: !!document.querySelector("aside")?.checkVisibility(),
    treeShown: !!document.querySelector("[role=tree]")?.checkVisibility(),
    text: document.querySelector("aside")?.textContent ?? "",
    focus: document.activeElement?.id,
  });
  await m.getByRole("tab", { name: "Tree" }).click();
  await m.locator(row(HDR)).click();
  await settle(
    m,
    "mobile: tapping a tree row opens the Details tab with the element",
    details,
    (v) =>
      v.tab === "Details" &&
      v.asideShown &&
      !v.treeShown &&
      v.text.includes("GroupHeader"),
  );
  await m.getByRole("tab", { name: "Tree" }).click();
  await m.getByLabel("Find an element").fill("InstructingAgent");
  await m
    .getByRole("list", { name: "Search results" })
    .locator("button", { has: m.getByText(`${HDR}/InstgAgt`, { exact: true }) })
    .click();
  await settle(
    m,
    "mobile: a search pick opens the Details tab and puts focus on it",
    details,
    (v) =>
      v.tab === "Details" &&
      v.text.includes("Agent that instructs the next") &&
      v.focus === "tab-ws-details",
  );
  const md = await open(390, 800, `#${HDR}/MsgId`);
  await md
    .locator(sel(`${HDR}/MsgId`))
    .waitFor({ state: "attached", timeout: 5000 });
  await settle(
    md,
    "mobile: a deep link opens the Details tab with the ISO definition",
    details,
    (v) =>
      v.tab === "Details" &&
      v.asideShown &&
      v.text.includes("Point to point reference"),
  );
  await settle(
    md,
    "mobile: page does not scroll sideways",
    () => document.documentElement.scrollWidth <= innerWidth,
    (fits) => fits,
  );

  // races, with type files delayed or failed by request interception
  const r1 = await slowDeepLink(GH, 1500, `#${HDR}/MsgId`);
  await r1.p.locator(row(TX)).click(); // the user acts while the deep link is still loading
  await r1.released;
  await sleep(400);
  check(
    (await r1.p.locator(sel(TX)).count()) === 1 &&
      (await hash(r1.p)) === `#${TX}` &&
      (await r1.p.locator(sel(`${HDR}/MsgId`)).count()) === 0 &&
      (await expanded(r1.p, HDR)) === "false",
    "race: a slow deep link does not steal a later click or open its branch",
  );

  const r2 = await open(1280, 900);
  let rel!: () => void;
  const held = new Promise<void>((x) => (rel = x));
  await r2.route(`**/types/${GH}.json`, async (r) => {
    await sleep(1500);
    await r.continue();
    rel();
  });
  await r2.evaluate((h) => (location.hash = h), `#${HDR}/MsgId`); // slow
  await r2.evaluate((h) => (location.hash = h), `#${TX}/PmtId`); // fast
  await r2.locator(sel(`${TX}/PmtId`)).waitFor({ timeout: 5000 });
  await within(held, 6500, "the delayed file");
  await sleep(400);
  check(
    (await r2.locator(sel(`${TX}/PmtId`)).count()) === 1 &&
      (await hash(r2)) === `#${TX}/PmtId` &&
      (await r2.locator(sel(`${HDR}/MsgId`)).count()) === 0 &&
      (await expanded(r2, HDR)) === "false",
    "race: a slow earlier hash does not override a newer one or open its branch",
  );

  const ctx3 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const r3 = await ctx3.newPage();
  let failing = true;
  await r3.route(`**/types/${GH}.json`, (r) =>
    failing ? r.abort() : r.continue(),
  );
  await r3.goto(`${page}#${HDR}/MsgId`, { waitUntil: "networkidle" });
  const errText = r3.locator(row(HDR)).getByText("This branch did not load.");
  await errText.waitFor({ timeout: 5000 });
  check(
    (await expanded(r3, HDR)) === "true" &&
      (await r3.locator("[role=treeitem][aria-selected='true']").count()) === 0,
    "failed ancestor: the branch opens with an error and nothing is selected",
  );
  failing = false;
  await r3.locator(row(HDR)).getByRole("button", { name: "Try again" }).click();
  await r3.locator(row(`${HDR}/MsgId`)).waitFor({ timeout: 3000 });
  check(
    (await errText.count()) === 0,
    "failed ancestor: Try again loads the children and clears the error",
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
