// Browser check for the mapping page: draft notice, both tables against the YAML, element link into the workspace,
// no sideways page scroll at 390px. Needs a built dist (npm run build, which also runs Pagefind).
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { chromium } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const PAGE = `${url}mappings/mt103-pacs.008/`;
const yaml = parseYaml(
  readFileSync("src/content/mappings/mt103-pacs.008.yaml", "utf8"),
) as { rows: { field: string; paths: string[] }[]; additions: unknown[] };
const DRAFT =
  "AI-drafted from two public sources, not yet reviewed by a person (T-081). Do not rely on it for real payments.";
const FIRST = yaml.rows.find((r) => r.field === "20")!.paths[0]!;

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
const open = async (width: number, to: string) => {
  const p = await (
    await browser.newContext({ viewport: { width, height: 900 } })
  ).newPage();
  await throttle(p);
  await p.goto(to, { waitUntil: "networkidle" });
  return p;
};

try {
  for (const width of [1280, 390]) {
    const p = await open(width, PAGE);
    await settle(
      p,
      `${width}: the draft notice shows and both tables have the YAML's row counts (${yaml.rows.length}, ${yaml.additions.length})`,
      (draft) => ({
        draft: [...document.querySelectorAll("p")].some(
          (x) => x.checkVisibility() && x.textContent?.trim() === draft,
        ),
        rows: document.querySelectorAll("[data-mapping-table=rows] tbody tr")
          .length,
        additions: document.querySelectorAll(
          "[data-mapping-table=additions] tbody tr",
        ).length,
      }),
      (s) =>
        s.draft &&
        s.rows === yaml.rows.length &&
        s.additions === yaml.additions.length,
      DRAFT,
    );
  }

  const d = await open(1280, PAGE);
  await d
    .locator("[data-mapping-table=rows] tbody tr")
    .filter({ has: d.locator("th", { hasText: /^20/ }) })
    .locator("a")
    .first()
    .click();
  await d
    .waitForURL(`${url}messages/pacs.008.001.14/#${FIRST}`)
    .catch(() => {}); // a miss shows up in the settled read below
  await settle(
    d,
    `1280: the first element link of row 20 selects ${FIRST} in the workspace`,
    (path) => ({
      tree: !!document.querySelector(
        `[role=treeitem][aria-selected='true'][data-path="${path}"]`,
      ),
      url: location.pathname + location.hash,
    }),
    (s) => s.tree && s.url === `${BASE}messages/pacs.008.001.14/#${FIRST}`,
    FIRST,
  );

  const m = await open(390, PAGE);
  await settle(
    m,
    "390: the page does not scroll sideways",
    () => ({ w: document.documentElement.scrollWidth, i: innerWidth }),
    (x) => x.w <= x.i,
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
