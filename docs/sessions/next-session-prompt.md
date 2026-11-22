# Next session prompt: Phase 4

Paste the block below into a new Claude Code session. Delete or update this note when Phase 4 is done. Before pasting: do T-045 (review `/messages/pacs.008.001.14/`) and put your findings in `docs/sessions/` or tell the session what to change first.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Work on the Phase 4 tasks from
the ledger using /superpowers:subagent-driven-development, same as the last session.

Start: read CLAUDE.md, docs/Home.md and docs/plan/Ledger.md, and the last session note
docs/sessions/2026-11-22.md (all of it: rulings, deferred minors). Invoke
superpowers:using-superpowers as CLAUDE.md says. Phase 3 is merged; T-045 (my prototype
review) is #me. If I left review findings (in the ledger line or a session note), fix them
first as small PRs before Phase 4.

Tasks, in this order (re-check dependencies in the ledger before each):
1. T-050 SchemaTree page (full tree incl. elements the sample does not use) with lazy
   expansion, mandatory-only filter, search, deep links. Reuse src/lib/resolver.ts
   (childrenOf, resolvePath) and src/components/ElementPanel.tsx; the tree must not ship
   the whole schema JSON eagerly (JS budget, npm run check:size): build-time data, lazy
   chunks. Recursion in the schema must not loop. Use frontend-design:frontend-design.
2. T-051 Split-pane workspace (XML | tree | details; tabs on mobile). Complex: per ADR-011
   brainstorm, spec in docs/superpowers/specs/, plan, then build. It shares selection state
   between AnnotatedXml, the tree and the panel (the spec for T-042 deferred a signals
   decision to here). Keyboard-resizable panes, tabs on mobile.
3. T-052 Ctrl+K command palette with a build-time element index; Pagefind for lessons and
   glossary (the lessons and glossary do not exist yet: index what exists, wire the rest
   later). Complex: spec first.
Skip #me tasks (T-045, T-093). Do not start Phase 5.

How to run it (same as last session):
- One branch and one PR per task off an up-to-date main (feat/, fix/, docs/, chore/),
  Conventional Commits, small commits, commit trailer Co-Authored-By per the session's
  attribution reminder.
- Per task: write the brief from a plan file (docs/superpowers/plans/, Task N headings; use
  the skill's task-brief and review-package scripts), fresh implementer subagent (model set
  explicitly, never inherited), then a task reviewer subagent (spec compliance and quality).
  Put the review result on the PR as a comment, fix Critical and Important findings on the
  same branch by resuming the implementer (fix loop, scoped re-review), record deferred
  minors in the session note.
- Last session's lesson: reviewers found checks that could not fail (swallowed timeouts,
  tautological assertions). Require every new check to be shown failing once, then restored.
  Reviewers have also caught wording copied from ISO definitions: content is own wording.
- Code is written with ponytail in full mode. Run npm test, lint, format:check, build,
  check:size, check:a11y and check:ui yourself before opening the PR; do not rely only on
  the subagent's report.
- Merging is delegated for this session: once the review is clean (no open Critical or
  Important findings) and the CI `build` check is green for the PR's head commit, merge the
  PR yourself with a merge commit, then pull main and branch the next task from it. Merge in
  dependency order. Never merge a PR with a red or pending check, an open Critical or
  Important finding, or a #me dependency.
- Still forbidden without my OK: pushing to main directly, force-push, deleting branches,
  changing repo settings or rulesets, and committing the eRepository files.
- At the end: tick the ledger (with PR links) and write docs/sessions/YYYY-MM-DD.md
  (done / next / blockers), via a docs/ PR you also merge.

Facts from the last session:
- Built in Phase 3: src/lib/resolver.ts (resolvePath, childrenOf, root-prefix stripping;
  min/max/mandatory are local to the parent, choice alternatives are never "mandatory"),
  src/lib/xml-tree.ts (XmlNode with resolved `info`), src/lib/xml-view.ts (states, previews,
  beginner filter), src/lib/content-schemas.ts (zod), scripts/check-content.ts (in
  `npm run build` and CI), `npm run check:xml` (xmllint), `npm run check:ui` (Playwright,
  scripts/serve-dist.ts), page /messages/[id] with AnnotatedXml and ElementPanel.
- Sample: src/content/samples/pacs.008-basic.xml (30 element paths, all annotated in
  src/content/annotations/pacs.008.001.14.yaml; the overlay is AI-drafted and unreviewed,
  docs/sources.md says so). Unquoted date-like YAML values break the build: quote them.
- Island data is resolved at build time and passed as props (spec approach 1). The schema
  JSON (4500 lines) must never reach the browser whole.
- ADR-013: pacs XSDs committed unmodified in schemas/ with THIRD-PARTY-NOTICES.md (do not
  edit that text). iso20022.org returns HTTP 403 to scripts; I download by hand. T-104 is
  closed (terms read, redistribution allowed).
- Names and definitions come from the local eRepository (git-ignored, 113 MB, never commit);
  regenerate with `npm run extract-erepository` then `npm run import-xsd` (docs/maintenance.md).
  Generated files src/data/erepository/*.json and src/data/schema/*.json are never
  hand-edited. CI has no eRepository, so tests that need it must skip.
- Node 24.2+, Astro 7, Tailwind v4, Preact 11, TypeScript 6, `npm test` uses native type
  stripping (node --test file.ts, .ts import extensions, no enums).
- Schema JSON codes are strings or {code, name, definition}; the JSON also has
  `constraints` (business rules by name and definition), not yet shown in the UI: T-050 or
  T-051 can surface them in the panel.
- About ten docs/ files show as modified in git status because of CRLF line endings
  (diff is empty with --ignore-cr-at-eol): never stage them, `git add` specific files only.
- Content rules: public sources only (each in docs/sources.md), base ISO 20022 only (no
  CBPR+), own wording beside the official definition, synthetic data only.

Carry-over minors (fix as a small chore PR when convenient, or when touching the file):
- Deferred minors per task are listed in docs/sessions/2026-11-22.md.
- scripts/check-js-size.ts: unit test for its import parser; throw on URLs without the base
  path prefix (it is fail-open now).
- import-xsd.ts: warn (or require the defs path) when run without a defs file; test that
  defs win over XSD documentation.
- extract-erepository.ts: duplicate xmi:id or code values overwrite silently; one-line
  entries break the block reader; add() throws on unreachable malformed entries.
- CI has no Playwright browser cache or job timeout (optional); check:content runs twice in CI.
- Base.astro props are untyped (ESLint cannot parse TS in .astro); a JSDoc type is the fix.
- withastro/action cannot read .nvmrc; deploy.yml hardcodes node-version 24. Keep in sync.
- docs/maintenance.md has a changelog step with no ledger task; Project Plan "Decisions made"
  does not mention ADR-012/013. PR #9 (Dependabot, TypeScript 7) is open and its last CI run
  failed: leave it unless build, lint and astro check pass on it.
```
