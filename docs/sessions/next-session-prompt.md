# Next session prompt: Phase 3

Paste the block below into a new Claude Code session. Delete or update this note when Phase 3 is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Work on the Phase 3 tasks
from the ledger using /superpowers:subagent-driven-development, same as the last session.

Start: read CLAUDE.md, docs/Home.md and docs/plan/Ledger.md, and the last session note
docs/sessions/2026-11-21.md (sections "Phase 2" and "Phase 2 close"). Invoke
superpowers:using-superpowers as CLAUDE.md says.

Tasks, in this order (re-check dependencies in the ledger before each):
1. T-040 synthetic pacs.008.001.14 sample (fictional BICs, test IBANs), valid under xmllint
   against schemas/pacs.008.001.14.xsd; add an xmllint step to CI. CI must fail on an
   invalid sample.
2. T-041 zod schemas in src/content.config.ts (message, annotations, sample). A malformed
   content file must fail the build. Reuse scripts/schema-model.ts where it fits.
3. T-038 unit tests for the schema resolver in lib/. NOTE: the resolver does not exist yet.
   Build the smallest resolver over src/data/schema/pacs.008.001.14.json (path lookup, type
   fallback, choice elements) as part of this task, then test it.
4. T-043 check-content.ts (unresolved elements, dead overlay paths, coverage report) and add
   it to CI. Breaking a path must fail the build.
5. T-042 AnnotatedXml + ElementPanel (Preact island). Complex: per ADR-011 brainstorm, spec in
   docs/superpowers/specs/, plan, then build. Use frontend-design:frontend-design. Keep the
   JS budget (npm run check:size) and the axe check green.
6. T-044 overlay for about 30 key elements, then T-046 (legend, hover previews,
   beginner/full mode) if time allows.
Skip #me tasks (T-045 prototype review, T-104 terms reading). Do not start Phase 4.

How to run it (same as last session):
- One branch and one PR per task off an up-to-date main (feat/, fix/, docs/, chore/),
  Conventional Commits, small commits, commit trailer Co-Authored-By per the session's
  attribution reminder.
- Per task: fresh implementer subagent (model set explicitly, never inherited), then a task
  reviewer subagent (spec compliance and quality) using the skill's task-brief and
  review-package scripts. Put the review result on the PR as a comment, fix Critical and
  Important findings on the same branch (fix loop, scoped re-review), and record deferred
  minors in the session note.
- Code is written with ponytail in full mode. Run npm test, lint, format:check and build
  yourself before opening the PR; do not rely only on the subagent's report.
- Merging is delegated for this session: once the review is clean (no open Critical or
  Important findings) and the CI `build` check is green, merge the PR yourself with a merge
  commit, then pull main and branch the next task from it. Merge in dependency order. If a
  PR is stacked on another, merge the lower one first and retarget the next to main
  (`gh pr edit N --base main`) before merging it. Never merge a PR with a red or pending
  check, an open Critical or Important finding, or a #me dependency.
- Still forbidden without my OK: pushing to main directly, force-push, deleting branches,
  changing repo settings or rulesets, and committing the eRepository files.
- At the end: tick the ledger (with PR links) and write docs/sessions/YYYY-MM-DD.md
  (done / next / blockers), via a docs/ PR you also merge.

Facts from the last session:
- ADR-013: the pacs XSDs are committed unmodified in schemas/ with THIRD-PARTY-NOTICES.md
  (do not edit that text). iso20022.org returns HTTP 403 to scripts, so nothing can be
  fetched automatically; I download by hand. T-104 (reading the terms) is still mine; if it
  shows redistribution is forbidden I will reverse ADR-013.
- The real XSDs have no xs:documentation. Names and definitions come from the local
  eRepository (20260904_ISO20022_2013_eRepository/, ISO20022_2013_ecore_metamodel/): 113 MB,
  git-ignored, never commit. Regenerate with `npm run extract-erepository` then
  `npm run import-xsd` (commands in docs/maintenance.md). The generated files
  src/data/erepository/pacs.008.001.14.defs.json and src/data/schema/pacs.008.001.14.json
  are never hand-edited. CI has no eRepository, so tests that need it must skip.
- Node 24.2 or later (engines >=24.2, import.meta.main), Astro 7, Tailwind v4, Preact 11,
  TypeScript 6. `npm test` uses Node native type stripping (node --test file.ts).
- Schema JSON codes are strings or {code, name, definition}; UI code must handle both.
  The JSON also has `constraints` (business rules by name and definition), worth surfacing.
- Content rules: public sources only (each in docs/sources.md), base ISO 20022 only (no
  CBPR+), own wording beside the official definition, synthetic data only.

Carry-over minors (fix as a small chore PR when convenient, or when touching the file):
- scripts/check-js-size.ts: unit test for its import parser; throw on URLs without the base
  path prefix (it is fail-open now).
- import-xsd.ts: warn (or require the defs path) when run without a defs file; test that
  defs win over XSD documentation.
- extract-erepository.ts: duplicate xmi:id or code values overwrite silently; one-line
  entries break the block reader; add() throws on unreachable malformed entries.
- CI has no Playwright browser cache or job timeout (optional).
- Base.astro props are untyped (ESLint cannot parse TS in .astro); a JSDoc type is the fix.
- withastro/action cannot read .nvmrc; deploy.yml hardcodes node-version 24. Keep in sync.
- docs/maintenance.md has a changelog step with no ledger task; Project Plan "Decisions made"
  does not mention ADR-012/013. PR #9 (Dependabot, TypeScript 7) is open: leave it unless
  build, lint and astro check pass on it, then you may merge it too.
```
