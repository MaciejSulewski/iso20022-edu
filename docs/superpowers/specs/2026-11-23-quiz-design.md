# T-091 pacs.008 quiz: design

Ledger task T-091. Complex per [[ADR-011 Process per task]]: a new data format and a new island (scoring). Decided without a live approval round; every **[call]** is mine.

## Intent

Lesson 6 ("Check yourself") lists eight questions with answers underneath for the reader to mark. T-091 turns them into a scored quiz: the reader picks answers, presses one button, sees a score and, for every question, whether the pick was right and why.

## Content truth rules

- The questions are the eight of lesson 6 **[call]**, as multiple choice. Every claim in a question, a right answer or an explanation already stands in lessons 1 to 5, the glossary or the schema (`src/data/schema/pacs.008.001.14.json`). No new fact, no CBPR+ rule, no MT field fact, no scheme usage rule.
- Wrong options (distractors) must be clearly wrong by the lessons or the schema, and must not be true-but-different statements a careful reader could defend. When a distractor needs a fact the site does not state, drop it for one that does not.
- Own wording; each explanation names the lesson (and element path where there is one) the answer comes from. Explanations are not the ISO sentences.
- The page and every question carry the draft status: AI-drafted, not reviewed by a person (T-093).

## Design

**Data** (`src/content/quizzes/<id>.yaml`, strict zod `QuizSchema`): `id` (file name; `pacs.008`), `message`, `title`, `summary`, `lesson` (the recap lesson id, `check-yourself`), `lastReviewed` (`{date, by}`), `questions[]`: `id`, `prompt`, `options` (3 or 4 strings), `answer` (0-based index into `options`), `explanation` (required), `lesson` (lesson id the answer comes from, optional), `elements` (paths, default `[]`, shown as links to the workspace).

**check-content rules:** parses against the schema; `id` matches the file name; `message` has a schema; `lesson` and each question's `lesson` exist; every `elements` path resolves; `answer` is a valid index; options are distinct within a question; question ids are unique; the right answers are not all at the same index **[call]** (position must not give the answer away); the count is printed (`Quizzes: N`).

**Logic** (`src/lib/quiz.ts`, pure, unit tested): `score(questions, picks)` where `picks[i]` is the chosen index or `undefined`; returns `{ correct, total, results }`, each result `right | wrong | skipped`. A skipped question counts as wrong **[call]** and is shown as "Not answered".

**Page** `/quiz/<id>/` (`src/pages/quiz/[id].astro`) with one island `Quiz.tsx` (`client:load`): a native `<form>`, per question a `<fieldset>` with a `<legend>` (the prompt) and radio inputs (so arrow keys, Tab and screen readers work with no custom code). One "Check my answers" button. On submit: a status line (live region) "You scored N of M", and under each question its verdict as text (Right / Not quite / Not answered, never colour alone), what the right answer is when the pick was wrong, the explanation, the lesson link and element links. Radios are disabled after checking; "Try again" clears all picks, hides results and puts focus on the first question. Nothing is saved (no localStorage) **[call]**: a fresh page is a fresh quiz. Options keep the authored order (no shuffle) **[call]**, so the checks and the explanations stay predictable. Draft notice above the form as on the other pages. Indexed by Pagefind (Ctrl+K finds "quiz").

**Wiring:** `lesson-tools.ts` gets `quiz: "quiz/pacs.008/"` and the lesson page tool link says "Take the quiz" (`lesson.toolQuiz`); Start here's step 6 then links the quiz through the existing `toolHref`. Lesson 6's text drops "Nothing here is scored or saved" and "A scored quiz is planned..." and points to the quiz; its eight questions and answers stay as the printable recap **[call]**, which keeps the lesson useful without JavaScript.

**Checks:** check-content rules and tests; `src/lib/quiz.test.ts`; `scripts/check-quiz.ts` in `check:ui` (expected answers read from the YAML, never from the page): all right gives "N of N" and every question shows a verdict and an explanation; one wrong pick gives "N-1 of N", marks exactly that question wrong and names the right answer; submitting with nothing picked gives "0 of N" with every question "Not answered"; "Try again" clears the picks and results and focuses the first question; keyboard only (Tab, arrow keys, Space, Enter) can complete and submit it; no sideways page scroll at 390. `check-lessons` and `check:a11y` cover the lesson link and the new page. Every check is shown failing once.

## Not doing

Shuffling, timers, progress saving, per-question instant feedback, a question bank beyond lesson 6, multi-select questions, Polish text, sharing a score.
