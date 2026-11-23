// Browser check for the quiz: scoring and verdicts against the YAML's answers, Try again, keyboard only,
// no sideways scroll at 390px, axe on the results state, the lesson and Start here links.
// Expected values come from the YAML, never from the page. Needs a built dist (npm run build).
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { parse as parseYaml } from "yaml";
import { chromium, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
type Q = {
  id: string;
  options: string[];
  answer: number;
  explanation: string;
};
const quiz = parseYaml(
  readFileSync("src/content/quizzes/pacs.008.yaml", "utf8"),
) as { id: string; questions: Q[] };
const qs = quiz.questions;
const N = qs.length;
const PAGE = `${url}quiz/${quiz.id}/`;
const RIGHT = "Right";
const WRONG = "Not quite";
const SKIPPED = "Not answered";
const LESSON = "check-yourself";

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
  // the island must be hydrated before the first click
  await settled0(p);
  return p;
};
const settled0 = (p: Page) =>
  p
    .waitForFunction(() => !document.querySelector("astro-island[ssr]"), null, {
      timeout: 5000,
    })
    .then(() => undefined);
const radio = (p: Page, i: number, j: number) =>
  p.locator(`[data-quiz-question="${qs[i]!.id}"] input[value="${j}"]`);
const submit = (p: Page) => p.getByRole("button", { name: "Check my answers" });
// what the page shows after checking, per question and for the status line
const readResults = () => ({
  status: document.querySelector("[data-quiz-status]")?.textContent ?? "",
  radios: [...document.querySelectorAll("input[type=radio]")].map(
    (r) => (r as HTMLInputElement).disabled,
  ),
  qs: [...document.querySelectorAll("[data-quiz-question]")].map((li) => {
    const box = li.querySelector("[data-quiz-result]");
    const ps = [...(box?.querySelectorAll(":scope > p") ?? [])].map(
      (x) => x.textContent ?? "",
    );
    return {
      id: li.getAttribute("data-quiz-question")!,
      kind: box?.getAttribute("data-quiz-result") ?? "",
      verdict: ps[0] ?? "",
      paras: ps,
    };
  }),
});
type Read = ReturnType<typeof readResults>;

// answers: the picked option index per question, or undefined. Clicks, then submits.
async function answerAndCheck(p: Page, picks: (number | undefined)[]) {
  for (const [i, j] of picks.entries())
    if (j !== undefined) await radio(p, i, j).check();
  await submit(p).click();
}
// the verdicts expected from the picks, built from the YAML
const expectKind = (picks: (number | undefined)[]) =>
  qs.map((q, i) =>
    picks[i] === undefined
      ? "skipped"
      : picks[i] === q.answer
        ? "right"
        : "wrong",
  );
const VERDICT = { right: RIGHT, wrong: WRONG, skipped: SKIPPED };
const verdictsOk = (s: Read, picks: (number | undefined)[]) =>
  s.qs.length === N &&
  s.qs.every((r, i) => {
    const q = qs[i]!;
    const kind = expectKind(picks)[i]!;
    return (
      r.id === q.id &&
      r.kind === kind &&
      r.verdict === VERDICT[kind] &&
      r.paras.includes(q.explanation) &&
      r.paras.some((x) => x.includes(q.options[q.answer]!)) ===
        (kind !== "right")
    );
  });
const allRight = qs.map((q) => q.answer);
const sum = (picks: (number | undefined)[]) =>
  picks.filter((j, i) => j === qs[i]!.answer).length;

try {
  check(
    qs.some((q) => q.answer > 0) && qs.every((q) => q.options.length > 1),
    "the YAML has questions with options and a right answer beyond the first (so a wrong pick differs from option 0)",
  );

  // (a) all right
  {
    const p = await open(1280, PAGE);
    await answerAndCheck(p, allRight);
    await settle(
      p,
      `(a) all right: the status says ${N} of ${N}, every question reads Right with its explanation, radios disabled`,
      readResults,
      (s) =>
        s.status === `You scored ${N} of ${N}` &&
        verdictsOk(s, allRight) &&
        s.radios.length > 0 &&
        s.radios.every((d) => d),
    );
    await p.context().close();
  }

  // (b) exactly one wrong, then (d) Try again
  {
    const k = Math.floor(N / 2);
    const picks: (number | undefined)[] = qs.map((q) => q.answer);
    picks[k] = (qs[k]!.answer + 1) % qs[k]!.options.length;
    const p = await open(1280, PAGE);
    await answerAndCheck(p, picks);
    await settle(
      p,
      `(b) one wrong (question ${k + 1}): the status says ${N - 1} of ${N}, only that question reads Not quite and names the right answer, the rest read Right`,
      readResults,
      (s) =>
        s.status === `You scored ${N - 1} of ${N}` &&
        verdictsOk(s, picks) &&
        s.qs.filter((r) => r.verdict === WRONG).length === 1,
    );
    await p.getByRole("button", { name: "Try again" }).click();
    await settle(
      p,
      "(d) Try again: no radio checked, none disabled, no verdict or status text, focus on the first radio",
      () => ({
        checked: document.querySelectorAll("input[type=radio]:checked").length,
        disabled: document.querySelectorAll("input[type=radio]:disabled")
          .length,
        results: document.querySelectorAll("[data-quiz-result]").length,
        status: document.querySelector("[data-quiz-status]")?.textContent,
        focus: document.activeElement?.id ?? "",
      }),
      (s) =>
        s.checked === 0 &&
        s.disabled === 0 &&
        s.results === 0 &&
        s.status === "" &&
        s.focus === `q-${qs[0]!.id}-0`,
    );
    await p.context().close();
  }

  // (c) nothing picked
  {
    const none = qs.map(() => undefined);
    const p = await open(1280, PAGE);
    await answerAndCheck(p, none);
    await settle(
      p,
      `(c) nothing picked: the status says 0 of ${N} and every question reads Not answered`,
      readResults,
      (s) => s.status === `You scored 0 of ${N}` && verdictsOk(s, none),
    );
    await p.context().close();
  }

  // (e) keyboard only: arrows and Space pick, Tab moves on, Enter submits
  {
    const picks: (number | undefined)[] = qs.map((q, i) =>
      i === 1 ? (q.answer + 1) % q.options.length : q.answer,
    );
    const p = await open(1280, PAGE);
    await radio(p, 0, 0).focus();
    for (const [i, j] of picks.entries()) {
      for (let a = 0; a < j!; a++) await p.keyboard.press("ArrowDown");
      await p.keyboard.press("Space");
      await settle(
        p,
        `(e) keyboard: question ${i + 1} holds option ${j} before Tab`,
        (id) => ({
          on: [
            ...document.querySelectorAll(
              `[data-quiz-question="${id}"] input:checked`,
            ),
          ].map((r) => (r as HTMLInputElement).value),
        }),
        (s) => s.on.length === 1 && s.on[0] === String(j),
        qs[i]!.id,
      );
      await p.keyboard.press("Tab");
    }
    await settle(
      p,
      "(e) keyboard: after the last question Tab reaches the submit button",
      () => ({ name: document.activeElement?.textContent ?? "" }),
      (s) => s.name === "Check my answers",
    );
    await p.keyboard.press("Enter");
    await settle(
      p,
      `(e) keyboard: Enter submits and the score is ${sum(picks)} of ${N}`,
      readResults,
      (s) =>
        s.status === `You scored ${sum(picks)} of ${N}` && verdictsOk(s, picks),
    );
    await p.context().close();
  }

  // (f) no sideways scroll at 390 with the results showing
  {
    const p = await open(390, PAGE);
    await answerAndCheck(p, allRight);
    await settle(
      p,
      "(f) 390: results showing, the page does not scroll sideways",
      () => ({
        n: document.querySelectorAll("[data-quiz-result]").length,
        w: document.documentElement.scrollWidth,
        i: innerWidth,
      }),
      (x) => x.n > 0 && x.w <= x.i,
    );
    await p.context().close();
  }

  // axe on the results state (check:a11y scans only the state before checking)
  for (const [width, scheme] of [
    [1280, "light"],
    [1280, "dark"],
    [390, "light"],
    [390, "dark"],
  ] as const) {
    const p = await open(width, PAGE);
    await p.evaluate(
      (t) => document.documentElement.classList.toggle("dark", t === "dark"),
      scheme,
    );
    // one wrong and one skipped, so every verdict style and the right-answer line are scanned
    const picks: (number | undefined)[] = qs.map((q) => q.answer);
    picks[0] = (qs[0]!.answer + 1) % qs[0]!.options.length;
    picks[1] = undefined;
    await answerAndCheck(p, picks);
    const ready = await settle(
      p,
      `axe ${width} ${scheme}: results showing before the scan`,
      readResults,
      (s) => verdictsOk(s, picks),
    );
    if (ready) {
      const { violations } = await new AxeBuilder({ page: p }).analyze();
      check(
        violations.length === 0,
        `axe ${width} ${scheme}, results state: ${violations.length} violation(s) ${violations
          .map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          )
          .join("; ")}`,
      );
    }
    await p.context().close();
  }

  // (g) the lesson's tool link and Start here step 6 go to the quiz
  {
    const want = `${BASE}quiz/${quiz.id}/`;
    const l = await open(1280, `${url}lessons/${LESSON}/`);
    await settle(
      l,
      `(g) lesson ${LESSON}: a "Take the quiz" link goes to ${want}`,
      () =>
        [...document.querySelectorAll("article a")]
          .filter((a) => a.textContent === "Take the quiz")
          .map((a) => (a as HTMLAnchorElement).pathname),
      (hrefs) => hrefs.length === 1 && hrefs[0] === want,
    );
    const h = await open(1280, url);
    await settle(
      h,
      `(g) Start here: step 6 links ${want}`,
      () =>
        [...document.querySelectorAll("#step-quiz ~ div a")].map(
          (a) => (a as HTMLAnchorElement).pathname,
        ),
      (hrefs) => hrefs.includes(want),
    );
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
