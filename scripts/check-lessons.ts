// Browser check for the lessons: Start here links, lesson page structure, related-element deep links, palette search.
// Needs a built dist (npm run build, which also runs Pagefind).
import { chromium } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const WORKSPACE = `${BASE}messages/pacs.008.001.14/`;
// the six lessons in step order, with the step each belongs to
const LESSONS = [
  { step: "lesson", slug: "what-is-pacs008", title: "What is pacs.008?" },
  { step: "xml", slug: "read-the-xml", title: "Reading the annotated XML" },
  {
    step: "tree",
    slug: "explore-the-tree",
    title: "Exploring the schema tree",
  },
  {
    step: "flow",
    slug: "follow-the-flow",
    title: "Following a payment from bank to bank",
  },
  { step: "mapping", slug: "from-mt103", title: "From MT 103 to pacs.008" },
  { step: "quiz", slug: "check-yourself", title: "Check yourself: a recap" },
];
// steps that have a tool, with where it lives; the others show only their lesson link
const TOOLS: Record<string, string> = {
  xml: WORKSPACE,
  tree: WORKSPACE,
  flow: `${BASE}flows/pacs.008-agent-chain/`,
  mapping: `${BASE}mappings/mt103-pacs.008/`,
};
// the tool link's wording per step
const label = (step: string) =>
  step === "flow"
    ? "Open the flow"
    : step === "mapping"
      ? "Open the mapping table"
      : "Open the workspace";
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

  // 1b. every step links its lesson; steps with a tool also keep the tool link; the others link nothing else
  await settle(
    home,
    "Start here: every step links its lesson (and only xml, tree, flow and mapping also their tool)",
    () =>
      Object.fromEntries(
        ["lesson", "xml", "tree", "flow", "mapping", "quiz"].map((id) => [
          id,
          [...document.querySelectorAll(`#step-${id} ~ div a`)].map(
            (a) => (a as HTMLAnchorElement).pathname,
          ),
        ]),
      ),
    (s) =>
      LESSONS.every((l) => {
        const links = s[l.step] ?? [];
        const lesson = `${BASE}lessons/${l.slug}/`;
        const tool = TOOLS[l.step];
        return tool
          ? links.length === 2 && links.includes(tool) && links.includes(lesson)
          : links.length === 1 && links[0] === lesson;
      }),
  );

  // 1c. the lesson links appear in step order
  await settle(
    home,
    "Start here: the six lesson links are in step order",
    () =>
      [...document.querySelectorAll("a")]
        .map((a) => (a as HTMLAnchorElement).pathname)
        .filter(
          (h) =>
            /\/lessons\/[^/]+\/$/.test(h) && h !== "/iso20022-edu/lessons/",
        ),
    (hrefs) =>
      [...new Set(hrefs)].join() ===
      LESSONS.map((l) => `${BASE}lessons/${l.slug}/`).join(),
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

    // 2b. the tool link at the end of the lesson: its wording and target (steps without a tool have none)
    const tool = TOOLS[l.step];
    await settle(
      p,
      `${l.slug}: the tool link ${tool ? `reads "${label(l.step)}" and goes to ${tool}` : "is absent"}`,
      () =>
        [...document.querySelectorAll("article > p > a")]
          .filter((a) => a.textContent?.startsWith("Open the"))
          .map((a) => ({
            text: a.textContent,
            path: (a as HTMLAnchorElement).pathname,
          })),
      (links) =>
        JSON.stringify(links) ===
        JSON.stringify(
          tool
            ? [
                {
                  text: label(l.step),
                  path: tool,
                },
              ]
            : [],
        ),
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
      (links) =>
        links.length > 0 &&
        links.every(
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

  // 3b. previous/next walk 1 to 6 and back
  const w = await page(1280, `${url}lessons/${LESSONS[0]!.slug}/`);
  const nav = (rel: string) =>
    document.querySelectorAll(`a[rel=${rel}]`).length;
  await settle(w, "lesson 1 has no previous link", nav, (n) => n === 0, "prev");
  for (const l of LESSONS.slice(1)) {
    await w.locator("a[rel=next]").click();
    await w.waitForURL(`${url}lessons/${l.slug}/`).catch(() => {});
    await settle(
      w,
      `Next walks to ${l.slug}`,
      () => location.pathname,
      (p) => p === `${BASE}lessons/${l.slug}/`,
    );
  }
  await settle(w, "lesson 6 has no next link", nav, (n) => n === 0, "next");
  for (const l of LESSONS.slice(0, -1).reverse()) {
    await w.locator("a[rel=prev]").click();
    await w.waitForURL(`${url}lessons/${l.slug}/`).catch(() => {});
    await settle(
      w,
      `Previous walks back to ${l.slug}`,
      () => location.pathname,
      (p) => p === `${BASE}lessons/${l.slug}/`,
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
