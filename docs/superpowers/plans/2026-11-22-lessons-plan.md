# T-092 Lessons: plan

Ledger task: T-092 (Phase 5). Complex task: spec [[2026-11-22-lessons-design]], decision [[ADR-016 Lessons as Markdown content]]. The spec is binding; this plan splits it into tasks.

**Global constraints (apply to every task).**

- Content rules (CLAUDE.md): public sources only, each fetched and recorded in `docs/sources.md` (URL, what it was used for, retrieval date; today is 2026-11-22). Base ISO 20022 only, no CBPR+, nothing from Swift MyStandards or other non-public material. Own wording: never reproduce or closely paraphrase a source sentence; the official ISO definition is shown beside own wording elsewhere in the site, so a lesson that quotes a definition quotes it as a quotation with its source. Synthetic data only. Say nothing that no fetched source or the schema JSON supports; where a fact is common knowledge but unsourced, either leave it out or label it in the text "not backed by a cited source". iso20022.org answers automated fetches with 403: use other public pages (central banks and market-infrastructure documentation, standards bodies, Wikipedia as a pointer only) and cite what you actually read.
- Plain English for a new bank employee on day one: short sentences, define each term the first time, no hype. 300 to 600 words per lesson, `##` headings, at most one small table per lesson.
- Every lesson: `lastReviewed.by` = `unreviewed (AI-drafted, pending T-093)`, a visible draft notice on the page.
- Every new check is shown failing once against a deliberate break, then restored. Browser checks wait with `settled()` from `scripts/ui-wait.ts` before reading position, focus, scroll or text after an action.
- UI work uses `frontend-design:frontend-design`; text only through `t()` and `src/i18n/ui.en.json`; keyboard operable, not colour-only, passes axe at desktop and 390px; follow the existing look (`text-muted`, `border-line`, tokens in `global.css`).
- Conventional Commits (`feat:`, `content:`, `test:`, `docs:`), small commits, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Stage specific files only.
- Before reporting run `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` and read the whole output for FAIL lines (`check:ui` and `check:a11y` read `dist`, so build first).

The six lesson slugs and steps (ids from `STEPS`, in order): `what-is-pacs008` (step `lesson`), `read-the-xml` (`xml`), `explore-the-tree` (`tree`), `follow-the-flow` (`flow`), `from-mt103` (`mapping`), `check-yourself` (`quiz`).

## Task 1: Lessons infrastructure and lesson 1

Files: `src/lib/content-schemas.ts` (+ `content-schemas.test.ts`), `src/content.config.ts`, `scripts/check-content.ts` (+ test), `src/content/lessons/en/what-is-pacs008.md`, `src/pages/lessons/index.astro`, `src/pages/lessons/[slug].astro`, `src/styles/global.css`, `src/pages/index.astro`, `src/components/StartHere.tsx`, `src/i18n/ui.en.json`, `scripts/check-lessons.ts`, `package.json` (`check:ui`), `docs/sources.md`.

1. `content-schemas.ts`: export `STEPS` (`["lesson","xml","tree","flow","mapping","quiz"]` as const) and strict `LessonSchema` per the spec (title, summary, step enum, order int 1 to 6, relatedElements default [], sources min 1 with https urls and `retrieved` day, lastReviewed). Tests: accepts a good lesson; rejects missing sources, unknown step, non-https url, extra key.
2. `content.config.ts`: `lessons` collection (glob `*.md`, base `src/content/lessons/en`, id = file name without extension).
3. `check-content.ts`: load `lessons/en/*.md` front matter (the `yaml` package is available; split on the `---` fences), validate with `LessonSchema`, rules from the spec: id matches file name, `step` unique, `order` unique and equal to the step position, every `relatedElements` path resolves, print `Lessons: N of 6 steps`. The "each step has a lesson" rule is NOT an error yet (Task 3 turns it on): implement it behind an option or as a separate returned list, tested both ways. Unit tests for each rule, each shown failing once.
4. Lesson 1 `what-is-pacs008.md` (research with web search and fetch, cite real fetched sources): what pacs.008 is (customer credit transfer between financial institutions, the message family `pacs`, "FIToFICustomerCreditTransfer"), who sends it to whom (debtor agent to creditor agent, possibly through intermediaries), what it carries in plain terms, how it differs from a customer-to-bank instruction (mention pain.001 only as a pointer if a fetched source supports it), what an MT 103 was (one line, pointer to lesson 5). `relatedElements`: a few real paths (for example `GrpHdr/MsgId`, `CdtTrfTxInf/PmtId/EndToEndId`, `CdtTrfTxInf/IntrBkSttlmAmt`). Add each source to `docs/sources.md` (table row: source, URL, used for, retrieved).
5. Pages: `/lessons/` (index) and `/lessons/<slug>/` as in the spec, using `frontend-design:frontend-design`; `.lesson` prose rules in `global.css` (readable measure about 65ch, heading scale, lists, table with visible borders, code); previous/next by `order`; draft notice; related-element links; Sources list. Pagefind default (indexed). All hrefs via `BASE_URL`.
6. Start here: `index.astro` builds steps from `STEPS`, resolves each step's lesson via `getCollection("lessons")`, passes `lessonHref`, `lessonTitle` to `StartHere`; step 1's `href` is its lesson; a step with no tool `href` shows the lesson link and the badge "Interactive step coming soon" (replace the `home.start.soon` text). Steps without a lesson yet (2 to 6 until Task 2/3) render as before, so Task 1 builds with only lesson 1. Add an "All lessons" link below the path.
7. `scripts/check-lessons.ts` (in `check:ui`): Start-here step 1 links to a `/lessons/` page; lesson 1 page has one `h1`, the draft notice, a Sources list with at least one link, the related-element links land on `/messages/pacs.008.001.14/#<path>` with the element selected; Ctrl+K with a distinctive phrase from lesson 1 shows a hit in the Pages group titled with the lesson title and Enter opens it. Show each assertion failing once.

Done when: build passes with one lesson, `check-content` prints `Lessons: 1 of 6 steps`, the palette finds the lesson after `npm run build`, and all local checks pass.

## Task 2: Lessons 2 and 3

Files: `src/content/lessons/en/read-the-xml.md`, `explore-the-tree.md`, `docs/sources.md`, `scripts/check-lessons.ts`.

- `read-the-xml` (step `xml`): how to read the annotated sample on the workspace page: namespaces and root (`Document`, `FIToFICstmrCdtTrf`), `GrpHdr` versus `CdtTrfTxInf`, the state markers (required, optional, choice, repeats, as the page shows them), beginner/full mode, code values such as `SttlmMtd`, `ChrgBr`, the two samples and what differs (intermediary agent, structured remittance). Describe only what the site actually does (read the workspace page and `src/i18n/ui.en.json`); XML basics need a fetched source.
- `explore-the-tree` (step `tree`): the schema tree: what the full element tree is, mandatory versus optional (min occurs), choice elements, repeating elements, type names (shared types), the "required only" filter and search, Ctrl+K, deep links (`#path`). Describe only what the site does.
- Each has `relatedElements` (real paths), sources (at least one fetched public source each, for XML/XSD basics and for what the schema's occurrence rules mean; the site's own behaviour needs no external source but say so in the report), sources.md rows.
- Extend `check-lessons.ts`: the Start-here steps `xml` and `tree` link lessons (and still keep their tool link); both lesson pages pass the same page checks. Show failing once.

Done when: `Lessons: 3 of 6 steps`, all local checks pass.

## Task 3: Lessons 4 to 6 and the hard rule

Files: `src/content/lessons/en/follow-the-flow.md`, `from-mt103.md`, `check-yourself.md`, `scripts/check-content.ts` (+ test), `scripts/check-lessons.ts`, `docs/sources.md`.

- `follow-the-flow` (step `flow`): how a customer credit transfer travels through banks in general: debtor, debtor agent, intermediary agents, creditor agent, creditor; message per hop (each bank sends its own message and gives it its own reference, the end-to-end reference stays); the settlement idea (settlement method codes INDA, INGA, COVE, CLRG as the schema and its code list define them); serial versus cover described at the level public sources support. No animated diagram. Mention that an interactive flow is planned (T-070) only as "coming soon".
- `from-mt103` (step `mapping`): MT 103 versus pacs.008 concepts in words, only what public sources support (what an MT 103 is, why ISO 20022 carries more structure, examples of how a free-text address or remittance line becomes structured elements, with real schema paths). No field-by-field table (that is T-080, which needs review). No Swift-only documentation.
- `check-yourself` (step `quiz`): a recap with 8 self-check questions and their answers, each answerable from lessons 1 to 5 and the schema JSON (not scored; no JavaScript); points to the planned quiz as "coming soon".
- Turn the hard rule on: `check-content` reports an error for a step without a lesson (test both ways, shown failing once), `index.astro` throws if a step has no lesson.
- `check-lessons.ts`: all six Start-here steps have a lesson link, in step order; all six lesson pages pass the page checks; previous/next chain walks 1 to 6 and back. Show failing once.

Done when: `Lessons: 6 of 6 steps`, every step links a lesson, the palette finds a lesson, all local checks pass.
