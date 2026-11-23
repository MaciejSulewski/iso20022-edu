# Next session prompt: Phase 8 (glossary and quiz)

Paste the block below into a new Claude Code session. Replace this note when the work is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Start Phase 8 using
/superpowers:subagent-driven-development, same as the last sessions.

Start: read CLAUDE.md, docs/Home.md, docs/plan/Ledger.md and the last session note
docs/sessions/2026-11-23.md (all of it, including "Phase 6 run" and "Phase 7 run": calls, deferred minors).
Invoke superpowers:using-superpowers as CLAUDE.md says.

State: Phases 6 and 7 are done. T-080 (PR #55) is merged: /mappings/mt103-pacs.008/ (MT 103
field to pacs.008 element table from a bank explainer and a vendor table, neither official,
shown as unreviewed), linked from Start here step 5 and lesson 5. CI `build` is green on main.
T-081 (review of the mapping) and T-093 (accuracy review of lessons, overlays, samples, the
flow) are mine and open; all of that text is AI-drafted and unreviewed.

Phase 8 tasks for you: T-090 (glossary for pacs.008 terms, linked from ElementPanel; done
when related terms and messages resolve) and T-091 (pacs.008 quiz; done when scoring works in
the browser and each answer has an explanation). The T-052 ledger note says T-090 wires glossary terms
into the Ctrl+K palette (src/lib/palette.ts, ADR-015; Pagefind indexes pages on build), and
lesson 6 (check-yourself) is the recap the quiz follows. Decide
per task whether it is complex (new data format or island: brainstorm, spec, plan per
ADR-011). Glossary terms and quiz answers are claims: base ISO 20022 only, public sources you
actually read, recorded in docs/sources.md, own wording beside the official definition, shown
as unreviewed. Use frontend-design:frontend-design for the UI. Skip #me tasks (T-081, T-093).
Do not start Phase 9.

Rules (same as before):
- One branch and PR per task off an up-to-date main, Conventional Commits, small commits,
  commit trailer Co-Authored-By per the session's attribution reminder (check the trailer
  subagents write).
- Per task: brief from a plan file (Task N headings; use the skill's task-brief and
  review-package scripts under .superpowers/sdd/), fresh implementer subagent with the
  model set explicitly, then a task reviewer subagent. Review result as a PR comment, fix
  Critical and Important on the same branch, deferred minors in the session note.
- Every new check must be shown failing once, then restored. In browser checks wait with
  settled() from scripts/ui-wait.ts before reading position, focus, scroll or text after an
  action. Reviewers keep catching checks that cannot fail, swallowed timeouts, wording
  copied from ISO definitions, claims beyond the cited sources.
- Run npm test, lint, format:check, build, check:size, check:a11y and check:ui yourself
  before opening or merging a PR (give each command's exit code). Do not trust only the
  subagent's report. A WSL Ubuntu clone (Node 24, Chromium) at ~/repo reproduces Linux;
  UI_DELAY_MS and UI_CPU_RATE slow the checks on purpose.
- Merging is delegated for this session: I approve merging your finished PRs (code and
  docs/ PRs alike). Merge with a merge commit once review is clean and CI `build` is green
  for the PR's head commit. Wait on CI with `gh pr checks <n> --watch --interval 30` (not
  `gh event listen`). Never merge a red or pending check, an open Critical/Important
  finding, or a #me dependency. Stacked PRs: merge the base PR first.
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
  the workspace page, 17 KB on the flow page, budget 100 KB. Lessons:
  src/content/lessons/en/*.md, pages src/pages/lessons/ (ADR-016). Flows:
  src/content/flows/*.yaml, FlowSchema in src/lib/content-schemas.ts, rules in
  scripts/check-content.ts, page src/pages/flows/[id].astro, island
  src/components/FlowPlayer.tsx (ADR-017). Samples carry `order`, page
  src/pages/messages/[id]/[...sample].astro. Start-here tools: src/lib/lesson-tools.ts
  (the mapping step links /mappings/mt103-pacs.008/; the quiz step has no tool yet).
  Mappings: src/content/mappings/*.yaml, MappingSchema in src/lib/content-schemas.ts, rules
  in scripts/check-content.ts, page src/pages/mappings/[id].astro (static, no island).
- Tree data: static JSON under /tree/<id>/types/<Type>.json and /tree/<id>/index.json
  (src/pages/tree/[id]/), built from src/lib/schema-tree.ts.
- Carry-over minors (chore PR when convenient): scripts/check-js-size.ts import-parser
  test and fail-closed URLs; import-xsd warn without defs; extract-erepository edge cases;
  CI Playwright cache and job timeout; check:content runs twice in CI; Base.astro JSDoc
  props type; deploy.yml Node version vs .nvmrc; maintenance.md changelog step; Project
  Plan "Decisions made" for ADR-012 to 017. PR #9 (Dependabot, TypeScript 7): leave it
  unless build, lint and astro check pass on it.
- Content rules: public sources only, base ISO 20022 only (no CBPR+), own wording beside
  the official definition, synthetic data only. Generated files are never hand-edited.
```
