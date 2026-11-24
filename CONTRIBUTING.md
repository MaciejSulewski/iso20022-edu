# Contributing

This is an educational, public site that teaches ISO 20022 (pacs.008 first). It is not affiliated with ISO or Swift. Thanks for helping.

The project plan, task ledger and decisions live in the `docs/` folder (an Obsidian vault). Start with [docs/Home.md](docs/Home.md) and [docs/plan/Ledger.md](docs/plan/Ledger.md).

## Workflow

- Work on a branch, one task per branch: `feat/…`, `fix/…` or `docs/…`.
- Never commit straight to `main`. Open a pull request; the maintainer merges it. (Claude agents merge their own PRs under the rule in `CLAUDE.md` and ADR-020.)
- Keep commits small and use Conventional Commits: `feat:`, `fix:`, `docs:`, `content:`, `chore:`.
- `npm run verify` (tests, lint, format, ledger, content and XML checks, build, JS size, accessibility and browser checks) must pass before you open a PR. The browser checks need Playwright's Chromium: `npx playwright install chromium`.

## Content rules

- Use public sources only, and record each one in `docs/sources.md`.
- Base ISO 20022 definitions only. CBPR+ usage guidelines are not public, so do not copy them.
- Write explanations in your own words and show the official ISO definition beside them.
- Use synthetic data only: fictional BICs, test IBANs. No secrets and no real client data.

## Reporting a content error

Open a GitHub issue with the "Report a content error" template: say which page and element is wrong and what the correct text should be, with a public source.

## Licences

- Code: MIT, see [LICENSE](LICENSE).
- Own content: CC BY 4.0, see [CONTENT-LICENSE](CONTENT-LICENSE).

By contributing you agree your work is released under these licences.
