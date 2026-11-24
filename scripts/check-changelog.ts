// Browser check for the changelog: entries in sorted order against the YAML, the home page footer link,
// no sideways scroll at 320px. Needs a built dist (npm run build).
import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { chromium } from "playwright";
import { sortEntries } from "../src/lib/changelog.ts";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const DIR = "src/content/changelog";
type Entry = { id: string; date: string; title: string };
const ui = JSON.parse(readFileSync("src/i18n/ui.en.json", "utf8")) as {
  "footer.changelog": string;
  "changelog.title": string;
};
const want = sortEntries(
  readdirSync(DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => parseYaml(readFileSync(`${DIR}/${f}`, "utf8")) as Entry),
).map(({ id, date, title }) => ({ id, date, title }));

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
  check(want.length > 0, `${DIR} holds entries (${want.length})`);

  // (a) every entry, newest first, with its date and title
  const c = await open(1280, `${url}changelog/`);
  await settle(
    c,
    `the changelog shows ${want.length} entries in sorted order with datetime and title`,
    () =>
      [...document.querySelectorAll("[data-changelog-entry]")].map((e) => ({
        id: e.getAttribute("data-changelog-entry"),
        date: e.querySelector("time")?.getAttribute("datetime") ?? "",
        title: e.querySelector("h2")?.textContent?.trim() ?? "",
      })),
    (s) => JSON.stringify(s) === JSON.stringify(want),
  );

  // (b) the home page footer link leads to the changelog
  const h = await open(1280, url);
  const link = h.locator("footer a", { hasText: ui["footer.changelog"] });
  await link.click();
  await h.waitForURL(`${url}changelog/`).catch(() => {}); // a miss shows in the read below
  await settle(
    h,
    `the home page footer link lands on /changelog/ with ${ui["changelog.title"]} as h1`,
    () => ({
      path: location.pathname,
      h1: document.querySelector("h1")?.textContent ?? "",
    }),
    (s) => s.path === `${BASE}changelog/` && s.h1 === ui["changelog.title"],
  );

  // (c) no sideways scroll at 320px
  const m = await open(320, `${url}changelog/`);
  await settle(
    m,
    "320: changelog/ does not scroll sideways",
    () => ({ w: document.documentElement.scrollWidth, i: innerWidth }),
    (x) => x.w <= x.i,
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
