# Next session prompt: Phase 9 (hardening)

Paste the block below into a new Claude Code session. Replace this note when the work is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Start Phase 9 using
/superpowers:subagent-driven-development, same as the last sessions.

Start: read CLAUDE.md, docs/Home.md, docs/plan/Ledger.md and the last session note
docs/sessions/2026-11-24.md (all of it: calls, deferred minors). Invoke
superpowers:using-superpowers as CLAUDE.md says.

State: Phases 6, 7 and 8 are done. T-090 (PR #57) and T-091 (PR #58) are merged: a glossary
of 18 pacs.008 terms at /glossary/ (Glossary link in the Details pane, found by Ctrl+K) and a
scored quiz at /quiz/pacs.008/ (the eight questions of lesson 6; Start here step 6 and lesson 6
link it). CI `build` is green on main. T-081 (review of the mapping) and T-093 (accuracy review
of lessons, overlays, samples, the flow, the glossary and the quiz) are mine and open; all of
that text is AI-drafted and unreviewed.

Phase 9 tasks for you: T-100 (final accessibility pass, mobile QA, Lighthouse check across all
pages; done when scores are recorded in the session note) and T-102 (schema diff script, old vs
new generated JSON; done when it prints added, removed and changed elements). Decide per task
whether it is complex (new script or data format: brainstorm, spec, plan per ADR-011). T-100 is
a pass over existing pages: record what you measured and how (tool, pages, widths), fix what the
pass finds in small PRs, and list what you did not check. The Start here "coming soon" branch
(`home.start.soon`) is dead now that every step has a tool; remove it if you touch StartHere.
Use frontend-design:frontend-design for any UI change. Skip #me tasks (T-081, T-093).

Rules (same as before):
- One branch and PR per task off an up-to-date main, Conventional Commits, small commits,
  commit trailer Co-Authored-By per the session's attribution reminder (check the trailer
  subagents write).
- Per task: brief from a plan file (Task N headings; use the skill's task-brief and
  review-package scripts under .superpowers/sdd/), fresh implementer subagent with the
  model set explicitly, then a task reviewer subagent. Review result as a PR comment, fix
  Critical and Important on the same branch (one fix round, then a scoped re-review), deferred
  minors in the session note.
- Every new check must be shown failing once, then restored. In browser checks wait with
  settled() from scripts/ui-wait.ts before reading position, focus, scroll or text after an
  action. Reviewers keep catching checks that cannot fail, expected values read from the page
  under test, swallowed timeouts, wording copied from ISO definitions, claims beyond the
  cited sources.
- Run npm test, lint, format:check, build, check:size, check:a11y and check:ui yourself
  before opening or merging a PR (give each command's exit code). Do not trust only the
  subagent's report. A WSL Ubuntu clone (Node 24, Chromium) at ~/repo reproduces Linux;
  UI_DELAY_MS and UI_CPU_RATE slow the checks on purpose.
- Merging is delegated: I approve merging your finished PRs (code and docs/ PRs alike) and you
  do not need to wait for me to open them. Merge with a merge commit once review is clean and
  CI `build` is green for the PR's head commit. Wait on CI with
  `gh pr checks <n> --watch --interval 30` (not `gh event listen`). Never merge a red or
  pending check, an open Critical/Important finding, or a #me dependency. Stacked PRs: merge
  the base PR first.
- Still forbidden without my OK: pushing to main, force-push, deleting branches, changing
  repo settings, committing the eRepository files, discarding my working-copy changes (ask
  first, even for CRLF-only ones).
- Stage specific files only: some docs/ files can show as modified because of CRLF line
  endings (diff empty with --ignore-cr-at-eol); they block `git pull` on main if the
  merge touches them, so ask me or stash, do not `git checkout --` them. Edits to CRLF files
  with some tools silently do not apply: check `git diff`. Pass long shell scripts to the
  Write tool, not a long heredoc.
- At the end: tick the ledger (PR links), write docs/sessions/YYYY-MM-DD.md (done / next /
  blockers) and refresh docs/sessions/next-session-prompt.md, via a docs/ PR.

Facts:
- Workspace: src/components/Workspace.tsx owns selection (one path string), hash and the
  details panel (ADR-014). Palette: src/components/Palette.tsx, src/lib/palette.ts
  (ADR-015); Pagefind runs in `npm run build` after astro build. Page JS about 22 KB gzip on
  the workspace page, 16 KB on the quiz page, 17 KB on the flow page, budget 100 KB.
  Lessons: src/content/lessons/en/*.md, pages src/pages/lessons/ (ADR-016). Flows:
  src/content/flows/*.yaml (ADR-017, island FlowPlayer.tsx). Mappings:
  src/content/mappings/*.yaml, static page src/pages/mappings/[id].astro. Glossary:
  src/content/glossary/*.yaml, GlossarySchema in src/lib/content-schemas.ts, helper
  src/lib/glossary.ts, pages src/pages/glossary/ (static), checks scripts/check-glossary.ts
  (ADR-018). Quiz: src/content/quizzes/*.yaml, QuizSchema, src/lib/quiz.ts (score), island
  src/components/Quiz.tsx, page src/pages/quiz/[id].astro, check scripts/check-quiz.ts
  (ADR-019). Content rules live in scripts/check-content.ts. Start-here tools:
  src/lib/lesson-tools.ts. Samples carry `order`, page
  src/pages/messages/[id]/[...sample].astro.
- Tree data: static JSON under /tree/<id>/types/<Type>.json and /tree/<id>/index.json
  (src/pages/tree/[id]/), built from src/lib/schema-tree.ts.
- Carry-over minors (chore PR when convenient): the lists in docs/sessions/2026-11-24.md and
  2026-11-23.md, including scripts/check-js-size.ts import-parser test and fail-closed URLs;
  import-xsd warn without defs; extract-erepository edge cases; CI Playwright cache and job
  timeout; check:content runs twice in CI; Base.astro JSDoc props type; deploy.yml Node version
  vs .nvmrc; maintenance.md changelog step; Project Plan "Decisions made" for ADR-012 to 019;
  the quiz form reloads the page if submitted before the island hydrates. PR #9 (Dependabot,
  TypeScript 7): leave it unless build, lint and astro check pass on it.
- Content rules: public sources only, base ISO 20022 only (no CBPR+), own wording beside
  the official definition, synthetic data only. Generated files are never hand-edited.
```
