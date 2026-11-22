# Next session prompt: finish T-051, then T-052

Paste the block below into a new Claude Code session. Replace this note when the work is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Finish Phase 4 using
/superpowers:subagent-driven-development, same as the last sessions.

Start: read CLAUDE.md, docs/Home.md, docs/plan/Ledger.md and the last session note
docs/sessions/2026-11-22.md (all of it, including "Phase 4 run": calls, deferred minors).
Invoke superpowers:using-superpowers as CLAUDE.md says.

State: T-050 is merged (PR #42). T-051 is built and reviewed clean on branch
feat/t-051-workspace, PR #43, but CI `build` is red: `npm run check:ui` fails on
mobile-width (390px) checks that pass locally. Three CI runs, three different failing
checks, same shape: a check reads layout right after Playwright sees the Details tab
selected, before the app's post-paint work (scroll, focus) has run. Last failing check:
"mobile: a search pick opens the Details tab and puts focus on it" (run 45030723782).

Job 1 (T-051, PR #43): make check:ui robust, do not widen tolerances or swallow timeouts.
 - Pull the failing log (`gh run view <id> --log-failed`) and read the measured values the
   new diagnostics print. Audit EVERY mobile check in scripts/check-annotated-xml.ts,
   check-schema-tree.ts and check-workspace.ts for the same pattern: after an action, wait
   for a settled state (the same value on two consecutive animation frames, bounded, throws
   on timeout) before reading position, focus or scroll. Consider a shared helper.
 - Look for an app-side cause too: Workspace.tsx does the scroll/focus after a pick in
   useLayoutEffect now; the tab switch and the pane reveal may still run in a later effect
   in the XML/tree panes (AnnotatedXml.tsx, SchemaTree.tsx, src/lib/reveal.ts).
 - Try to reproduce on Linux: CI runs Ubuntu with its own fonts (fractional layout). Run
   check:ui many times, with CPU throttling and a fractional offset, before pushing.
 - Every changed check must be shown failing once without its fix. Review result goes on
   PR #43 as a comment; put changes through the fix loop (resume or fresh implementer,
   scoped re-review). Merge #43 with a merge commit only when CI `build` is green for the
   head commit and no Critical/Important finding is open. Then pull main.

Job 2 (T-052, complex, ADR-011): Ctrl+K command palette with a build-time element index
(reuse src/lib/schema-tree.ts searchIndex and the workspace selection: picking an element
selects it in the Workspace via the hash), plus Pagefind for lessons and glossary (they do
not exist yet: index what exists, wire the rest later). Brainstorm, spec in
docs/superpowers/specs/, plan in docs/superpowers/plans/, then build. Use
frontend-design:frontend-design. Keep the page JS under the check:size budget (the
palette's index must load lazily as static JSON). Keyboard and a11y: dialog semantics,
focus return, Esc, no Ctrl+K hijack inside inputs where it would surprise.

Skip #me tasks (T-093). Do not start Phase 5.

Rules (same as before):
- One branch and PR per task off an up-to-date main, Conventional Commits, small commits,
  commit trailer Co-Authored-By per the session's attribution reminder (check the trailer
  subagents write: they used the wrong model name once).
- Per task: brief from a plan file (Task N headings; use the skill's task-brief and
  review-package scripts under .superpowers/sdd/), fresh implementer subagent with the
  model set explicitly, then a task reviewer subagent. Review result as a PR comment, fix
  Critical and Important on the same branch, deferred minors in the session note.
- Every new check must be shown failing once, then restored. Reviewers keep catching
  checks that cannot fail, swallowed timeouts, wording copied from ISO definitions.
- Run npm test, lint, format:check, build, check:size, check:a11y and check:ui yourself
  before opening or merging a PR. Do not trust only the subagent's report.
- Merging is delegated for this session: merge with a merge commit once review is clean
  and the CI `build` check is green for the PR's head commit. Never merge a red or pending
  check, an open Critical/Important finding, or a #me dependency.
- Still forbidden without my OK: pushing to main, force-push, deleting branches, changing
  repo settings, committing the eRepository files.
- Stage specific files only: about ten docs/ files show as modified because of CRLF line
  endings (diff empty with --ignore-cr-at-eol). Pass long shell scripts to the Write tool,
  not a long heredoc (one failed to parse last time).
- At the end: tick the ledger (PR links), write docs/sessions/YYYY-MM-DD.md (done / next /
  blockers) and refresh docs/sessions/next-session-prompt.md, via a docs/ PR you merge.

Facts:
- Workspace: src/components/Workspace.tsx owns selection (one path string), hash and the
  details panel; AnnotatedXml and SchemaTree are controlled; below 1280px tabs, above it
  three columns with keyboard/pointer resizable separators (ADR-014). Page JS 18.4 KB gzip.
- Tree data: static JSON under /tree/<id>/types/<Type>.json and /tree/<id>/index.json
  (src/pages/tree/[id]/), built from src/lib/schema-tree.ts.
- Carry-over minors (chore PR when convenient): scripts/check-js-size.ts import-parser
  test and fail-closed URLs; import-xsd warn without defs; extract-erepository edge cases;
  CI Playwright cache and job timeout; check:content runs twice in CI; Base.astro JSDoc
  props type; deploy.yml Node version vs .nvmrc; maintenance.md changelog step; Project
  Plan "Decisions made" for ADR-012/013/014. PR #9 (Dependabot, TypeScript 7): leave it
  unless build, lint and astro check pass on it.
- Content rules: public sources only, base ISO 20022 only (no CBPR+), own wording beside
  the official definition, synthetic data only. Generated files are never hand-edited.
```
