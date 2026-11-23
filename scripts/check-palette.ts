// Browser check for the Ctrl+K palette: lazy loading, opening, combobox behaviour, picks, errors, Pagefind, 390px.
// Needs a built dist (npm run build, which also runs Pagefind).
import { chromium, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const MSG = "messages/pacs.008.001.14/";
const msgUrl = `${url}${MSG}`;
const E2E = "CdtTrfTxInf/PmtId/EndToEndId";
const INSTG = "GrpHdr/InstgAgt";

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);

const DIALOG = "dialog[data-palette]";
// Fresh page that records requests, console errors and uncaught page errors.
async function fresh(width: number, height: number, to: string, wait = true) {
  const p = await (
    await browser.newContext({ viewport: { width, height } })
  ).newPage();
  await throttle(p);
  const errors: string[] = [];
  const requests: string[] = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("request", (r) => requests.push(r.url()));
  await p.goto(to, wait ? { waitUntil: "networkidle" } : {});
  return Object.assign(p, { errors, requests });
}
const input = (p: Page) => p.getByRole("combobox");
// what the palette shows, read in the page
const view = (sel: string) => {
  const d = document.querySelector(sel) as HTMLDialogElement;
  const a = document.activeElement as HTMLElement | null;
  return {
    open: d.open,
    focus: a ? `${a.tagName}:${a.getAttribute("aria-label") ?? ""}` : "",
    options: [...d.querySelectorAll("[role=option]")].map((o) => ({
      text: o.textContent ?? "",
      on: o.getAttribute("aria-selected") === "true",
    })),
    groups: [...d.querySelectorAll("[role=group]")].map(
      (g) => g.firstElementChild?.textContent ?? "",
    ),
    status: d.querySelector("[role=status]")?.textContent ?? "",
    active: d.querySelector("input")?.getAttribute("aria-activedescendant"),
  };
};
const isOpen = (p: Page) =>
  settle(p, "the palette is open", view, (v) => v.open, DIALOG);
const isClosed = (p: Page, what: string) =>
  settle(p, what, view, (v) => !v.open, DIALOG);
const activeIdx = (v: ReturnType<typeof view>) =>
  v.options.findIndex((o) => o.on);

try {
  // 1. nothing is fetched before the first open; the first open fetches the index and Pagefind
  const a = await fresh(1280, 900, `${url}`);
  const early = a.requests.filter((u) => /index\.json|pagefind/.test(u));
  check(
    early.length === 0,
    `nothing from the index or Pagefind is fetched before the first open (${early.join(", ")})`,
  );

  // 2. the header button opens it; dialog and combobox attributes
  await a.getByRole("button", { name: "Search" }).click();
  const v = await settle(
    a,
    "the header button opens the palette with the input focused",
    view,
    (s) => s.open && s.focus === "INPUT:Search elements and pages",
    DIALOG,
  );
  check(
    (await a.getByRole("dialog", { name: "Search the site" }).count()) === 1 &&
      (await input(a).getAttribute("aria-autocomplete")) === "list" &&
      (await input(a).getAttribute("aria-expanded")) === "false" &&
      (await input(a).getAttribute("aria-controls")) ===
        (await a.getByRole("listbox").getAttribute("id")) &&
      v !== undefined,
    "dialog is named, the combobox has aria-autocomplete=list, aria-expanded=false and aria-controls to the listbox",
  );
  await a
    .waitForFunction(
      () =>
        performance
          .getEntriesByType("resource")
          .some((r) => r.name.includes("index.json")) &&
        performance
          .getEntriesByType("resource")
          .some((r) => r.name.includes("pagefind.js")),
      undefined,
      { timeout: 5000 },
    )
    .then(
      () =>
        check(
          true,
          "index.json and pagefind.js are requested on the first open",
        ),
      () =>
        check(
          false,
          "index.json and pagefind.js are requested on the first open",
        ),
    );

  // 3. BICFI lists the element; arrows wrap; the status; empty state is axe-clean elsewhere
  await input(a).fill("BICFI");
  const r = await settle(
    a,
    "BICFI lists the BICFI element with its path, first row active, aria-expanded=true",
    view,
    (s) =>
      s.options.length > 0 &&
      s.options.some(
        (o) => o.text.includes("BICFI") && o.text.endsWith("/BICFI"),
      ) &&
      s.options[0]!.on &&
      s.groups[0] === "Elements",
    DIALOG,
  );
  check(
    (await input(a).getAttribute("aria-expanded")) === "true",
    "aria-expanded is true while results are listed",
  );
  const n = r?.options.length ?? 0;
  await a.keyboard.press("ArrowUp");
  await settle(
    a,
    "ArrowUp on the first row wraps to the last",
    view,
    (s) => activeIdx(s) === n - 1 && s.active !== null,
    DIALOG,
  );
  await a.keyboard.press("ArrowDown");
  await settle(
    a,
    "ArrowDown on the last row wraps to the first",
    view,
    (s) => activeIdx(s) === 0,
    DIALOG,
  );
  await a.keyboard.press("ArrowDown");
  await settle(
    a,
    "ArrowDown moves to the second row",
    view,
    (s) => activeIdx(s) === 1,
    DIALOG,
  );

  // 4. a broad query: "Showing 8 of N"
  await input(a).fill("Id");
  await settle(
    a,
    'a broad query lists 8 elements and says "Showing 8 of N"',
    view,
    (s) =>
      s.options.filter((o) => o.text.length).length >= 8 &&
      /^Showing \d+ of \d+$/.test(s.status) &&
      /^Showing 8 of \d+$/.test(s.status),
    DIALOG,
  );

  // 5. a no-match query
  await input(a).fill("zzzzqqqq");
  await settle(
    a,
    "a query with no match says No results and lists nothing",
    view,
    (s) => s.options.length === 0 && s.status === "No results",
    DIALOG,
  );

  // 6. a Pagefind hit for a word on the landing page (the only guard against a silent production failure)
  const g = await fresh(1280, 900, msgUrl);
  await g.getByRole("button", { name: "Search" }).click();
  await input(g).fill("remember");
  const pg = await settle(
    g,
    "a word from the landing page lists a Pagefind hit under Pages",
    view,
    (s) => s.groups.includes("Pages"),
    DIALOG,
  );
  check(
    !!pg?.options.some((o) => o.text.includes("what you remember")),
    "the Pages hit is the landing page (its excerpt holds the word)",
  );
  if (pg) {
    await g
      .locator(`${DIALOG} [role=group]`, { hasText: "Pages" })
      .locator("[role=option]")
      .first()
      .click();
    await g.waitForURL(url, { timeout: 5000 }).then(
      () => check(true, "picking the Pages hit opens the landing page"),
      () =>
        check(
          false,
          `picking the Pages hit opens the landing page (at ${g.url()})`,
        ),
    );
  }

  // 7. Enter from the landing page lands on the message with the element selected
  await a.keyboard.press("Escape");
  await a.keyboard.press("Control+K");
  await settle(
    a,
    "Ctrl+K opens the palette on the landing page, input focused",
    view,
    (s) => s.open && s.focus === "INPUT:Search elements and pages",
    DIALOG,
  );
  await input(a).fill("InstructingAgent");
  await settle(
    a,
    "InstructingAgent lists GrpHdr/InstgAgt",
    view,
    (s) => s.options.some((o) => o.text.endsWith(INSTG)),
    DIALOG,
  );
  // move to the row with that exact path
  for (let k = 0; k < 8; k++) {
    const s = await a.evaluate(view, DIALOG);
    if (s.options[activeIdx(s)]?.text.endsWith(INSTG)) break;
    await a.keyboard.press("ArrowDown");
  }
  await a.keyboard.press("Enter");
  await a.waitForURL(`${msgUrl}#${INSTG}`, { timeout: 5000 }).then(
    () =>
      check(true, "Enter lands on the message page with the path in the hash"),
    () =>
      check(
        false,
        `Enter lands on the message page with the path in the hash (at ${a.url()})`,
      ),
  );
  await settle(
    a,
    "the picked element is selected in the tree and the Details panel shows it",
    () => ({
      tree: !!document.querySelector(
        `[role=treeitem][aria-selected='true'][data-path="GrpHdr/InstgAgt"]`,
      ),
      title: document.querySelector("[aria-live] h2")?.textContent,
    }),
    (s) => s.tree && s.title === "InstructingAgent",
  );
  check(
    a.errors.length === 0,
    `no console or page errors on the landing page and the pick (${a.errors.join(" | ")})`,
  );

  // 8. on the workspace page: a pick updates the selection with no reload
  const w = await fresh(1280, 900, msgUrl);
  await w.evaluate(() => (document.body.dataset.same = "1"));
  await w.click(`[data-id="${E2E}"]`);
  await w.keyboard.press("Control+K");
  await isOpen(w);
  await input(w).fill("InstructingAgent");
  await settle(
    w,
    "workspace page: InstructingAgent is listed",
    view,
    (s) => s.options.some((o) => o.text.endsWith(INSTG)),
    DIALOG,
  );
  for (let k = 0; k < 8; k++) {
    const s = await w.evaluate(view, DIALOG);
    if (s.options[activeIdx(s)]?.text.endsWith(INSTG)) break;
    await w.keyboard.press("ArrowDown");
  }
  await w.keyboard.press("Enter");
  await settle(
    w,
    "workspace page: a pick closes the palette, moves the selection and the Details panel, with no reload",
    () => ({
      open: (
        document.querySelector("dialog[data-palette]") as HTMLDialogElement
      ).open,
      hash: location.hash,
      same: document.body.dataset.same === "1",
      tree: !!document.querySelector(
        `[role=treeitem][aria-selected='true'][data-path="GrpHdr/InstgAgt"]`,
      ),
      title: document.querySelector("[aria-live] h2")?.textContent,
    }),
    (s) =>
      !s.open &&
      s.hash === `#${INSTG}` &&
      s.same &&
      s.tree &&
      s.title === "InstructingAgent",
  );

  // 9. Ctrl+K inside the tree search input does nothing; the header button still works there
  await w.getByLabel("Find an element").focus();
  await w.keyboard.press("Control+K");
  await isClosed(
    w,
    "Ctrl+K inside the tree search input does not open the palette",
  );
  await w.keyboard.press("Escape"); // so that a wrongly opened palette does not block the button
  await w.getByRole("button", { name: "Search" }).click();
  await isOpen(w);

  // 10. Esc closes and focus returns to the opener (the header button)
  await w.keyboard.press("Escape");
  await settle(
    w,
    "Esc closes the palette and focus returns to the header button",
    view,
    (s) => !s.open && s.focus === "BUTTON:",
    DIALOG,
  );

  // 11. Esc after clicking non-focusable palette content closes the palette and keeps the selection
  await w.click(`[data-id="${E2E}"]`);
  await w.getByRole("button", { name: "Search" }).click();
  await isOpen(w);
  await w.locator(`${DIALOG} p`, { hasText: "Type an element name" }).click();
  await w.keyboard.press("Escape");
  await settle(
    w,
    "Esc after clicking palette text closes it and does not clear the workspace selection",
    () => ({
      open: (
        document.querySelector("dialog[data-palette]") as HTMLDialogElement
      ).open,
      hash: location.hash,
      marked: document.querySelectorAll("[aria-current='true']").length,
    }),
    (s) => !s.open && s.hash === `#${E2E}` && s.marked === 1,
  );

  // 12. Esc inside the empty palette (input focused) also keeps the selection
  await w.keyboard.press("Control+K");
  await isOpen(w);
  await w.keyboard.press("Escape");
  await settle(
    w,
    "Esc in the palette input closes it and keeps the selection",
    () => ({
      open: (
        document.querySelector("dialog[data-palette]") as HTMLDialogElement
      ).open,
      hash: location.hash,
    }),
    (s) => !s.open && s.hash === `#${E2E}`,
  );
  check(
    w.errors.length === 0,
    `no console or page errors on the workspace page (${w.errors.join(" | ")})`,
  );

  // 13. a failed index shows the error and Retry recovers
  const f = await fresh(1280, 900, msgUrl, false);
  let failing = true;
  await f.route(/index\.json/, (route) =>
    failing ? route.abort() : route.continue(),
  );
  await f.waitForLoadState("networkidle");
  await f.keyboard.press("Control+K");
  await settle(
    f,
    "a failed index shows the error message and a Retry button",
    view,
    (s) =>
      s.status === "The element index could not be loaded. Try again." &&
      s.focus === "INPUT:Search elements and pages",
    DIALOG,
  );
  check(
    (await f.getByRole("button", { name: "Retry" }).count()) === 1,
    "the Retry button is shown",
  );
  failing = false;
  if ((await f.getByRole("button", { name: "Retry" }).count()) > 0)
    await f.getByRole("button", { name: "Retry" }).click();
  await input(f).fill("BICFI");
  await settle(
    f,
    "Retry recovers: BICFI is listed, the error and Retry are gone",
    (sel) => ({
      options: document.querySelectorAll(`${sel} [role=option]`).length,
      retry: !!document.querySelector(`${sel} button`),
      status: document.querySelector(`${sel} [role=status]`)?.textContent ?? "",
    }),
    (s) => s.options > 0 && !s.retry && !/could not/.test(s.status),
    DIALOG,
  );

  // 14. 390px: the palette fits, no sideways scroll, rows at least 44px
  const m = await fresh(390, 800, msgUrl);
  await m.getByRole("button", { name: "Search" }).click();
  await isOpen(m);
  await input(m).fill("Id");
  await settle(
    m,
    "390px: the palette fits the viewport, the page does not scroll sideways, rows are at least 44px tall",
    (sel) => {
      const d = document.querySelector(sel) as HTMLElement;
      const b = d.getBoundingClientRect();
      const rows = [...d.querySelectorAll("[role=option]")].map(
        (o) => o.getBoundingClientRect().height,
      );
      return {
        fits: b.left >= 0 && b.right <= innerWidth,
        noScroll:
          document.documentElement.scrollWidth <= innerWidth &&
          d.scrollWidth <= d.clientWidth,
        rows: rows.length > 0 && rows.every((h) => h >= 44),
      };
    },
    (s) => s.fits && s.noScroll && s.rows,
    DIALOG,
  );
  check(
    m.errors.length === 0,
    `no console or page errors at 390 (${m.errors.join(" | ")})`,
  );

  // 15. a glossary term is found as a page from the glossary page, and Enter opens its page
  const TERM = "UETR";
  const TERM_ID = "uetr";
  const gl = await fresh(1280, 900, `${url}glossary/`);
  await gl.getByRole("button", { name: "Search" }).click();
  await input(gl).fill(TERM);
  // the rows with the group each one sits in, and which one is selected
  const rowsOf = (sel: string) => {
    const opts = [...document.querySelectorAll(`${sel} [role=option]`)];
    const row = (o: Element) => ({
      group: o.closest("[role=group]")?.firstElementChild?.textContent ?? "",
      text: o.textContent ?? "",
    });
    const on = opts.find((o) => o.getAttribute("aria-selected") === "true");
    return { rows: opts.map(row), on: on ? opts.indexOf(on) : -1 };
  };
  const isTerm = (r: { group: string; text: string }) =>
    r.group === "Pages" && r.text.startsWith(TERM);
  const hit = await settle(
    gl,
    `glossary page: ${TERM} lists a row titled ${TERM} in the Pages group`,
    rowsOf,
    (s) => s.rows.some(isTerm),
    DIALOG,
  );
  if (hit) {
    // ArrowDown to that row, reading the selection after every press
    let at = hit;
    for (
      let k = 0;
      k < hit.rows.length && !isTerm(at.rows[at.on] ?? { group: "", text: "" });
      k++
    ) {
      const from = at.on;
      await gl.keyboard.press("ArrowDown");
      const next = await settle(
        gl,
        `ArrowDown moves the selection towards the ${TERM} row (from row ${from})`,
        rowsOf,
        (s) => s.on !== from,
        DIALOG,
      );
      if (!next) break;
      at = next;
    }
    if (!isTerm(at.rows[at.on] ?? { group: "", text: "" })) {
      check(false, `the selection reached the ${TERM} row in the Pages group`);
      await gl.close();
    } else {
      await gl.keyboard.press("Enter");
      await gl.waitForURL(`${url}glossary/${TERM_ID}/`, { timeout: 5000 }).then(
        () =>
          check(true, `Enter on the ${TERM} row lands on its glossary page`),
        () =>
          check(
            false,
            `Enter on the ${TERM} row lands on its glossary page (at ${gl.url()})`,
          ),
      );
    }
  }

  // 16. the quiz page is found in the Pages group, and Enter opens it
  const QUIZ = "pacs.008 quiz";
  const isQuiz = (r: { group: string; text: string }) =>
    r.group === "Pages" && r.text.startsWith(QUIZ);
  const qz = await fresh(1280, 900, `${url}glossary/`);
  await qz.getByRole("button", { name: "Search" }).click();
  await input(qz).fill("quiz");
  const qhit = await settle(
    qz,
    `search "quiz": a row titled ${QUIZ} in the Pages group`,
    rowsOf,
    (s) => s.rows.some(isQuiz),
    DIALOG,
  );
  if (qhit) {
    let at = qhit;
    for (
      let k = 0;
      k < qhit.rows.length &&
      !isQuiz(at.rows[at.on] ?? { group: "", text: "" });
      k++
    ) {
      const from = at.on;
      await qz.keyboard.press("ArrowDown");
      const next = await settle(
        qz,
        `ArrowDown moves the selection towards the ${QUIZ} row (from row ${from})`,
        rowsOf,
        (s) => s.on !== from,
        DIALOG,
      );
      if (!next) break;
      at = next;
    }
    if (!isQuiz(at.rows[at.on] ?? { group: "", text: "" })) {
      check(false, `the selection reached the ${QUIZ} row in the Pages group`);
      await qz.close();
    } else {
      await qz.keyboard.press("Enter");
      await qz.waitForURL(`${url}quiz/pacs.008/`, { timeout: 5000 }).then(
        () => check(true, `Enter on the ${QUIZ} row lands on the quiz page`),
        () =>
          check(
            false,
            `Enter on the ${QUIZ} row lands on the quiz page (at ${qz.url()})`,
          ),
      );
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
