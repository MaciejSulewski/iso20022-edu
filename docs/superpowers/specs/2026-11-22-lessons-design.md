# Lessons (T-092): design

Ledger: T-092. Decision: [[ADR-016 Lessons as Markdown content]]. Builds on [[ADR-015 Palette on every page]]. Written without a live approval round, as for T-042, T-046, T-051 and T-052; every choice of mine is marked **[call]**. The text of the lessons is AI-drafted from public sources and stays unreviewed until T-093 (`#me`).

## Intent

A new bank colleague opens "Start here" and finds, at every step, a short plain-English lesson that explains the idea before the tool shows the detail: what pacs.008 is for, how to read the annotated XML, how to use the element tree, how a payment travels, how an old MT 103 maps to it, and how to check what they remember.

## Goals

- Six lessons, one per "Start here" step (`lesson`, `xml`, `tree`, `flow`, `mapping`, `quiz`), each 300 to 600 words in own wording, base ISO 20022 only (no CBPR+), synthetic examples only.
- Each lesson cites the public sources it rests on. Every cited URL is one the author actually fetched, with the retrieval date, and is also recorded in `docs/sources.md`. A statement no fetched source supports is left out, or marked in the lesson as not sourced.
- Each Start-here step links its lesson. The tool link (`messages/...`) stays where it exists; steps whose tool does not exist yet (flow, mapping, quiz) show the lesson link and the "coming soon" badge for the tool.
- Lessons appear in the Ctrl+K palette via Pagefind after `npm run build`, with the lesson title as the result title.
- A lesson can point into the workspace: `relatedElements` (paths) render as links to `/messages/pacs.008.001.14/#<path>`; every path resolves in the schema (checked by `check-content`).

## Non-goals

- No quiz scoring (T-091), no glossary (T-090), no flow animation (T-070/T-071), no mapping table (T-080). Lessons 4 to 6 are prose that those tasks will later link to.
- No MDX, no client JS on lesson pages, no new dependency (**[call]** no `@tailwindcss/typography`; a small `.lesson` rule block in `global.css` styles headings, lists, tables and code).
- No Polish text. `en` only ([[ADR-003 English first]]).

## Content model

`src/content/lessons/en/<slug>.md`, loaded by a `lessons` collection (glob loader, `*.md`, id = file name without extension). **[call]** The plan's section 3 names `lessons/en/*.md`; `en` stays in the path so a second language adds a folder, not a rename.

Front matter (zod `LessonSchema` in `src/lib/content-schemas.ts`, strict):

- `title` string, `summary` string (one sentence, shown on the index and as the page description), `step` enum of the six step ids, `order` int (equals the step position, 1 to 6), `relatedElements` string array (default empty), `sources` array of `{ title, url, retrieved }` (min 1), `lastReviewed` `{ date, by }` with `by` = "unreviewed (AI-drafted, pending T-093)".
- `STEPS` (ids in order) is exported once from `content-schemas.ts`; `index.astro` and the schema both use it.

`check-content` rules (pure function, tested, each shown failing once): lesson ids match file names, `step` unique across lessons, `order` unique, every `relatedElements` path resolves in the schema, `sources` urls are https. It prints `Lessons: N of 6 steps`. **[call]** The hard rule "every step has exactly one lesson" is enabled in the last task, once all six exist (it is an error then).

## Pages

- `/lessons/` index: ordered list of the six lessons (title, summary, step number), plain HTML. **[call]** No header nav item; the index is linked from the landing page, below the "Start here" path ("All lessons").
- `/lessons/<slug>/`: one `h1` (title), the draft notice ("AI-drafted from public sources, not yet reviewed by a person", visible text, not colour-only), the rendered Markdown, "Look at it in the workspace" links from `relatedElements` (link text = tag path), "Sources" list (title as link, retrieved date), previous/next lesson links by `order`, and a link to the step's tool when it exists.
- Pagefind: lesson pages are indexed (default `Base` behaviour); the palette result title is the `h1`. The lessons index is indexed too. Excerpts come from the body.
- Base path: all links use `import.meta.env.BASE_URL`.

## Start here

`index.astro` builds the steps from `STEPS`, looks each lesson up by `step` and passes `lessonHref` and `lessonTitle` to `StartHere`. Step 1 ("Read the lesson") has `href` = its lesson (one link, not two). A step without `href` shows the lesson link and a badge reading "Interactive step coming soon" (text from `ui.en.json`). Build fails if a step has no lesson once the hard rule is on.

## Checks

- Unit: `LessonSchema` (accepts a good lesson, rejects a missing source, an unknown step, a non-https url), the check-content lesson rules.
- Browser (`scripts/check-lessons.ts`, in `check:ui`, `settled()` for every post-action read): every Start-here step has a link into `/lessons/`; each lesson page has one `h1`, the draft notice, a Sources list with at least one link, working previous/next; Ctrl+K typing a distinctive phrase from lesson 1 shows a lesson hit in the Pages group and Enter opens it; `relatedElements` links land on the workspace with the element selected. `check:a11y` already scans every built page at both widths.
- `npm run check:size`: lesson pages ship no island except the header palette and theme toggle.

## Risks

- Accuracy: AI-drafted payment text can be wrong. Mitigations: sources per lesson, "unreviewed" notice, T-093 review by the project owner before the site is shared, reviewers check claims against the cited sources.
- iso20022.org answers automated fetches with 403 ([[sources]]). The author must find other public pages (central banks, market infrastructures, standards bodies, Wikipedia) and say what each was used for.
- Copying: lessons must not reproduce source text; reviewers compare.
