# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Planning only. The repo holds just `docs/` (an Obsidian vault); there is no code, `package.json`, git repo or GitHub remote yet. Phase 0 (T-010 to T-015 in the ledger) creates them. So there are no build, lint or test commands to run yet. The planned ones are `npm run build` (includes content checks), `npm run preview`, and the `import-xsd` test.

## Session routine

- Start: read `docs/Home.md` and `docs/plan/Ledger.md`.
- End: update the ledger and write `docs/sessions/YYYY-MM-DD.md` (done / next / blockers).
- Ledger line format: `- [ ] T-NNN description #me|#agent #phase/N`. IDs are never reused. Done = `[x]` + `✅ YYYY-MM-DD` + link to the PR or session note. Blocked = `#blocked` + reason. `#me` tasks (accounts, tokens, review, merging PRs) are the user's, not yours.
- Decisions live as one note per decision in `docs/decisions/ADR-NNN *.md`. Obsidian `[[wikilinks]]` are used between notes.

## What is being built

A static, public, non-affiliated Astro site that teaches ISO 20022 (**pacs.008 only** in Stage 1) to new bank staff. The full design is in `docs/plan/Project Plan.md`. The key architecture, which spans several files:

- **Structure is generated, explanations are hand-written.** `scripts/import-xsd.ts` turns the official XSD into `src/data/schema/<id>.json` (never hand-edit). A YAML overlay in `src/content/annotations/` adds plain-English text, keyed `byPath` (tag path from root, no indexes), falling back to `byType`, then to the ISO definition from the XSD.
- **Content is validated at build time**: zod schemas in `src/content.config.ts`, plus `scripts/check-content.ts`, which fails the build on unresolved sample elements and dead overlay, quiz or mapping paths, and reports annotation coverage. Samples are checked with `xmllint --schema` in CI.
- **Stack choices:** `fast-xml-parser` (`preserveOrder`) at build time only; vanilla TS and Astro components, no UI framework; text is locale-keyed (`{ en, pl? }`) but English only for now; deploy via GitHub Actions to GitHub Pages.
- `docs/` sits outside `src/`, so Astro never builds or publishes it.

## Content and workflow rules (from the plan)

- Base ISO 20022 definitions only (CBPR+ is not public). Public sources only, each recorded in `docs/sources.md`. Own wording, with the official ISO definition shown beside it. Synthetic data only (fictional BICs, test IBANs). No secrets or real client data.
- Branches `feat/…`, `fix/…`, `docs/…`; Conventional Commits (`feat:`, `fix:`, `docs:`, `content:`, `chore:`). Change `main` only through a PR the user merges. Never push to `main`, force-push, delete branches or change repo settings without the user's OK.
- Licences: code MIT, own content CC BY 4.0, with the disclaimer "educational, not affiliated with ISO/Swift".
