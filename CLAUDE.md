# CLAUDE.md

Rules for Claude Code in this repository. Project description, design and status live in `docs/` (an Obsidian vault), not here.

## Where to find things

- `docs/Home.md`: vault entry point.
- `docs/plan/Project Plan.md`: what is built, architecture, data model, phases, risks.
- `docs/plan/Ledger.md`: tasks and status.
- `docs/decisions/ADR-NNN *.md`: one note per decision.
- `docs/sessions/YYYY-MM-DD.md`: session logs.
- `docs/sources.md`: public sources used for content.
- `CONTRIBUTING.md`: the same working rules for humans.

## Session routine

- Start: read `docs/Home.md` and `docs/plan/Ledger.md`.
- End: update the ledger and write `docs/sessions/YYYY-MM-DD.md` (done / next / blockers).
- Ledger line format: `- [ ] T-NNN description #me|#agent #phase/N`. IDs are never reused. Done = `[x]` + `✅ YYYY-MM-DD` + link to the PR or session note. Blocked = `#blocked` + reason.
- `#me` tasks (accounts, tokens, review, merging PRs) are the user's, not yours.
- New decisions go in a new `docs/decisions/ADR-NNN *.md`. Use Obsidian `[[wikilinks]]` between notes.

## Git rules

- Branches `feat/…`, `fix/…`, `docs/…`. Conventional Commits (`feat:`, `fix:`, `docs:`, `content:`, `chore:`), small commits.
- Change `main` only through a PR the user merges.
- Never push to `main`, force-push, delete branches or change repo settings without the user's OK.
- `npm run build` (includes content checks) must pass before a PR, once it exists.

## Content rules

- Base ISO 20022 definitions only (CBPR+ is not public).
- Public sources only, each recorded in `docs/sources.md`.
- Own wording, with the official ISO definition shown beside it.
- Synthetic data only (fictional BICs, test IBANs). No secrets or real client data.
- Never hand-edit generated files (`src/data/schema/*.json`); change `scripts/import-xsd.ts` instead.
- Licences: code MIT, own content CC BY 4.0, with the disclaimer "educational, not affiliated with ISO/Swift".
