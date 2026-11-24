# T-100: accessibility, mobile QA and Lighthouse pass

Simple task ([[ADR-011 Process per task]]): measure, fix what the pass finds, record the scores in the session note.

## Global constraints

- Lighthouse in small batches: one run at a time, each result written to disk before the next ([[2026-11-24]] "T-100 state and constraints"; the owner approved batches on 2026-11-24).
- Fix findings in this PR only when small; record the rest as minors.
- A new check is shown failing once against the bug, then passing after the fix.

## Task 1: measure

- Lighthouse 13.6 (`npx lighthouse`, Playwright's Chromium 1255 via `CHROME_PATH`, headless), pages served from `dist` by `scripts/serve-dist.ts`, mobile and desktop presets, the four categories. One page of each kind: landing, both workspace samples, lessons index, one lesson, flow, mapping, glossary index, one glossary term, quiz, 404 (11 pages, 22 runs).
- Mobile QA with Playwright at 320, 390 and 768 px over all 33 built pages (not `dev/ui`): page-level horizontal overflow, elements past the right edge outside a scroll container, tap targets under 24 px, and a full-page screenshot of each page at each width, looked at by hand for the dense pages.
- Hydration diff over all 33 pages: island text with JavaScript off against the text after hydration.
- Axe is already covered by `check:a11y` (all pages, 1280 and 390 px, light and dark).

## Task 2: fix the Start here step numbers

- Finding: after hydration the step numbers read "1.." to "6..". `{i + 1}.` renders two text nodes, the server HTML merges them into one and hydration adds the dot again. The hydration diff found no other island with a difference.
- Fix: one template string in `StartHere.tsx`.
- Also, since StartHere is touched: remove the dead "coming soon" branch and `home.start.soon`. `href` becomes required and `index.astro` fails the build for a step without a tool, matching the existing rule for lessons.
- Check: `check-lessons.ts` case 1d reads the step numbers after hydration (no `astro-island[ssr]` left) and expects `1.` to `6.` from the lesson list in step order. Shown failing against the unfixed build (`["1..", …, "6.."]`).
