# Next session prompt: Phase 5 (pacs.008 depth)

Paste the block below into a new Claude Code session. Replace this note when the work is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Start Phase 5 using
/superpowers:subagent-driven-development, same as the last sessions.

Start: read CLAUDE.md, docs/Home.md, docs/plan/Ledger.md and the last session note
docs/sessions/2026-11-22.md (all of it, including "Phase 4 close": calls, deferred minors).
Invoke superpowers:using-superpowers as CLAUDE.md says.

State: Phase 4 is done. T-050 (PR #42), T-051 (PR #43) and T-052 (PR #45) are merged.
Workspace at /messages/pacs.008.001.14/ (XML | tree | details, tabs below 1280px), Ctrl+K
palette on every page (elements from the tree index, pages from Pagefind). CI `build` is
green on main.

Phase 5 tasks for you: T-060 (overlay by type for shared components, plus code
explanations), T-061 (second sample: intermediary agent, structured remittance; it must pass
xmllint and check-content; check:xml validates every sample against the pacs.008 XSD) and
T-092 (draft lessons from public sources in own wording, recorded in docs/sources.md; the
"Start here" path must link a lesson at each step; lessons must show up in the Ctrl+K
palette via Pagefind after a build). Decide the order and which are complex (spec first,
ADR-011). Use frontend-design:frontend-design for UI.
Skip #me tasks (T-093 lesson accuracy review is mine). Do not start Phase 6.

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
  copied from ISO definitions.
- Run npm test, lint, format:check, build, check:size, check:a11y and check:ui yourself
  before opening or merging a PR. Do not trust only the subagent's report. A WSL Ubuntu
  clone (Node 24, Chromium) at ~/repo reproduces Linux; UI_DELAY_MS and UI_CPU_RATE slow the
  checks on purpose.
- Merging is delegated for this session only if I say so; otherwise leave PRs open. When
  delegated: merge with a merge commit once review is clean and CI `build` is green for the
  PR's head commit. Never merge a red or pending check, an open Critical/Important finding,
  or a #me dependency.
- Still forbidden without my OK: pushing to main, force-push, deleting branches, changing
  repo settings, committing the eRepository files.
- Stage specific files only: about ten docs/ files show as modified because of CRLF line
  endings (diff empty with --ignore-cr-at-eol). Pass long shell scripts to the Write tool,
  not a long heredoc.
- At the end: tick the ledger (PR links), write docs/sessions/YYYY-MM-DD.md (done / next /
  blockers) and refresh docs/sessions/next-session-prompt.md, via a docs/ PR.

Facts:
- Workspace: src/components/Workspace.tsx owns selection (one path string), hash and the
  details panel (ADR-014). Palette: src/components/Palette.tsx, src/lib/palette.ts
  (ADR-015); Pagefind runs in `npm run build` after astro build. Page JS 21.9 KB gzip on
  the workspace page, budget 100 KB.
- Tree data: static JSON under /tree/<id>/types/<Type>.json and /tree/<id>/index.json
  (src/pages/tree/[id]/), built from src/lib/schema-tree.ts.
- Carry-over minors (chore PR when convenient): scripts/check-js-size.ts import-parser
  test and fail-closed URLs; import-xsd warn without defs; extract-erepository edge cases;
  CI Playwright cache and job timeout; check:content runs twice in CI; Base.astro JSDoc
  props type; deploy.yml Node version vs .nvmrc; maintenance.md changelog step; Project
  Plan "Decisions made" for ADR-012/013/014/015. PR #9 (Dependabot, TypeScript 7): leave it
  unless build, lint and astro check pass on it.
- Content rules: public sources only, base ISO 20022 only (no CBPR+), own wording beside
  the official definition, synthetic data only. Generated files are never hand-edited.
```
