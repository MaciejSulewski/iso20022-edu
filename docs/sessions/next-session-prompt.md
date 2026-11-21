# Next session prompt: Phase 2

Paste the block below into a new Claude Code session. Delete or update this note when Phase 2 is done.

```text
Continue the ISO 20022 learning site (repo: iso20022-edu). Work on the Phase 2 tasks
from the ledger using /superpowers:subagent-driven-development, same as the last session.

Start: read CLAUDE.md, docs/Home.md and docs/plan/Ledger.md, and the last session note
docs/sessions/2026-11-21.md.

Tasks, in this order:
1. T-030 (runs first: version + redistribution terms decide whether definitions are
   committed or fetched in CI; record the decision in docs/sources.md, add an ADR if it
   changes ADR-006 Licences).
2. T-031 (import-xsd.ts + test). Complex: per ADR-011 do brainstorm, short spec in
   docs/superpowers/specs/, then plan, then build. Unknown XSD constructs must fail loudly.
3. T-032 (generate src/data/schema/pacs.008.001.NN.json; never hand-edit it).
4. T-035 (docs/maintenance.md, following section 8 of the Project Plan).
Skip #me tasks (T-025, T-026).

How to run it (same as last session):
- One branch and one PR per task off an up-to-date main (feat/, fix/, docs/, chore/),
  Conventional Commits, small commits. Commit trailer: Co-Authored-By per the session's
  attribution reminder.
- Per task: fresh implementer subagent (model set explicitly, never inherited), then a
  task reviewer subagent for spec compliance and quality, using the skill's task-brief and
  review-package scripts. Put the review result on the PR as a comment, fix Critical and
  Important findings on the same branch, wait for the CI `build` check to be green, then
  merge the PR (only if the user has told this session to merge after review; otherwise
  leave the PR open for the user).
- Code is written with ponytail in full mode. No UI is expected in Phase 2.
- Content rules: public sources only, each recorded in docs/sources.md; base ISO 20022
  only (no CBPR+); synthetic data only. Generated files are never hand-edited.
- Never push to main directly, force-push, delete branches or change repo settings.
- At the end: update the ledger (ticks with PR links) and write docs/sessions/YYYY-MM-DD.md
  (done / next / blockers).

Carry-over notes from the last session:
- scripts/check-js-size.ts has minor follow-ups: no unit test for its import parser, and it
  is fail-open on URLs without the base-path prefix (should throw). Fix when touching
  scripts/ or as a small chore PR.
- CI has no Playwright browser cache or job timeout (optional).
- check-content does not exist yet (T-043); do not add a fake CI step.
- Base.astro props are untyped (ESLint cannot parse TS in .astro); a JSDoc type is the
  suggested fix.
- withastro/action cannot read .nvmrc; deploy.yml hardcodes node-version 24. Keep in sync.
- Node 24, Astro 7, Tailwind v4, Preact 11, TypeScript 6. `npm test` uses Node native
  type stripping (node --test file.ts).
```
