// Browser check for the lessons: Start here links, lesson page structure, related-element deep links, palette search.
// Needs a built dist (npm run build, which also runs Pagefind).
import { chromium } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const WORKSPACE = `${BASE}messages/pacs.008.001.14/`;
// the lessons built so far, with the step each belongs to
const LESSONS = [
  { step: "lesson", slug: "what-is-pacs008", title: "What is pacs.008?" },
  { step: "xml", slug: "read-the-xml", title: "Reading the annotated XML" },
  {
    step: "tree",
    slug: "explore-the-tree",
    title: "Exploring the schema tree",
  },
];
const LESSON = `${url}lessons/${LESSONS[0]!.slug}/`;
const TITLE = LESSONS[0]!.title;
const PHRASE = "debtor agent";

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
const page = async (width: number, to: string) => {
  const p = await (
    await browser.newContext({ viewport: { width, height: 900 } })
  ).newPage();
  await p.goto(to, { waitUntil: "networkidle" });
  return p;
};

try {
  // 1. Start here: step 1 links to a lesson page; "All lessons" links to the index
  const home = await page(1280, url);
  await settle(
    home,
    "Start here: step 1 links to a /lessons/ page, and All lessons links to the index",
    () => ({
      step: [...document.querySelectorAll("#step-lesson ~ div a")].map(
        (a) => (a as HTMLAnchorElement).pathname,
      ),
      all: [...document.querySelectorAll("a")]
        .filter((a) => a.textContent === "All lessons")
        .map((a) => a.pathname),
    }),
    (s) =>
      s.step.length === 1 &&
      /^\/iso20022-edu\/lessons\/[^/]+\/$/.test(s.step[0]!) &&
      s.all.length === 1 &&
      s.all[0] === "/iso20022-edu/lessons/",
  );

  // 1b. steps with a tool keep the tool link and also link their lesson
  await settle(
    home,
    "Start here: steps xml and tree link the workspace and their lesson",
    () =>
      Object.fromEntries(
        ["xml", "tree"].map((id) => [
          id,
          [...document.querySelectorAll(`#step-${id} ~ div a`)].map(
            (a) => (a as HTMLAnchorElement).pathname,
          ),
        ]),
      ),
    (s) =>
      LESSONS.slice(1).every((l) => {
        const links = s[l.step] ?? [];
        return (
          links.length === 2 &&
          links.includes(WORKSPACE) &&
          links.includes(`${BASE}lessons/${l.slug}/`)
        );
      }),
  );

  for (const l of LESSONS) {
    const lessonUrl = `${url}lessons/${l.slug}/`;
    // 2. the lesson page
    const p = await page(1280, lessonUrl);
    await settle(
      p,
      `lesson ${l.slug}: one h1 with the title, the draft notice, Sources with at least one link`,
      () => ({
        h1: [...document.querySelectorAll("h1")].map((h) => h.textContent),
        draft: document.body.textContent!.includes(
          "AI-drafted from public sources, not yet reviewed by a person.",
        ),
        sources: document.querySelectorAll("#sources ~ ul a[href^='https://']")
          .length,
      }),
      (s) =>
        s.h1.length === 1 && s.h1[0] === l.title && s.draft && s.sources >= 1,
    );

    // 3. related-element links point into the workspace and select the element
    const hrefs = await settle(
      p,
      `${l.slug}: related-element links go to /messages/pacs.008.001.14/#<path>`,
      () =>
        [...document.querySelectorAll("#related ~ ul a")].map((a) => ({
          href:
            (a as HTMLAnchorElement).pathname + (a as HTMLAnchorElement).hash,
          text: a.textContent,
        })),
      (l) =>
        l.length > 0 &&
        l.every(
          (a) => a.href === `/iso20022-edu/messages/pacs.008.001.14/#${a.text}`,
        ),
    );
    const first = hrefs?.[0]?.text ?? "";
    await p.locator("#related ~ ul a").first().click();
    await p
      .waitForURL(`${url}messages/pacs.008.001.14/#${first}`)
      .catch(() => {}); // a miss shows up in the settled read below
    await settle(
      p,
      `${l.slug}: following the first related link selects ${first} in the tree`,
      (path) => ({
        tree: !!document.querySelector(
          `[role=treeitem][aria-selected='true'][data-path="${path}"]`,
        ),
        url: location.pathname + location.hash,
      }),
      (s) =>
        s.tree && s.url === `/iso20022-edu/messages/pacs.008.001.14/#${first}`,
      first,
    );
  }

  // 4. Ctrl+K finds the lesson under Pages, and Enter opens it
  const q = await page(1280, url);
  await q.keyboard.press("Control+K");
  await q.getByRole("combobox").fill(PHRASE);
  const view = (t: string) => {
    const d = document.querySelector("dialog[data-palette]")!;
    const group = [...d.querySelectorAll("[role=group]")].find(
      (g) => g.firstElementChild?.textContent === "Pages",
    );
    const opts = [...d.querySelectorAll("[role=option]")];
    return {
      pages: group
        ? [...group.querySelectorAll("[role=option]")].map(
            (o) => o.textContent ?? "",
          )
        : [],
      all: opts.map((o) => o.textContent ?? ""),
      active: opts.findIndex((o) => o.getAttribute("aria-selected") === "true"),
      activeText:
        opts.find((o) => o.getAttribute("aria-selected") === "true")
          ?.textContent ?? "",
      t,
    };
  };
  await settle(
    q,
    `searching "${PHRASE}" lists the lesson in the Pages group, titled "${TITLE}"`,
    view,
    (s) => s.pages.some((x) => x.startsWith(TITLE)),
    TITLE,
  );
  // walk to the lesson row one key press at a time, waiting for each move to settle
  const target = (await q.evaluate(view, TITLE)).all.findIndex((x) =>
    x.startsWith(TITLE),
  );
  for (let k = 1; k <= target; k++) {
    await q.keyboard.press("ArrowDown");
    await settle(q, `row ${k} is active`, view, (v) => v.active === k, TITLE);
  }
  await q.keyboard.press("Enter");
  await q.waitForURL(LESSON, { timeout: 5000 }).then(
    () => check(true, "Enter on the lesson hit opens the lesson page"),
    () =>
      check(false, `Enter on the lesson hit opens the lesson (at ${q.url()})`),
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
