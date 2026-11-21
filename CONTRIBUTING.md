# Contributing

This is an educational, public site that teaches ISO 20022 (pacs.008 first). It is not affiliated with ISO or Swift. Thanks for helping.

The project plan, task ledger and decisions live in the `docs/` folder (an Obsidian vault). Start with [docs/Home.md](docs/Home.md) and [docs/plan/Ledger.md](docs/plan/Ledger.md).

## Workflow

- Work on a branch, one task per branch: `feat/…`, `fix/…` or `docs/…`.
- Never commit straight to `main`. Open a pull request; the maintainer merges it.
- Keep commits small and use Conventional Commits: `feat:`, `fix:`, `docs:`, `content:`, `chore:`.
- Once the site exists, `npm run build` (it includes the content checks) must pass before you open a PR.

## Content rules

- Use public sources only, and record each one in `docs/sources.md`.
- Base ISO 20022 definitions only. CBPR+ usage guidelines are not public, so do not copy them.
- Write explanations in your own words and show the official ISO definition beside them.
- Use synthetic data only: fictional BICs, test IBANs. No secrets and no real client data.

## Reporting a content error

Open a GitHub issue. A "report a content error" template is planned (task T-015). Until then, say which page and element is wrong and what the correct text should be, with a public source.

## Licences

- Code: MIT, see [LICENSE](LICENSE).
- Own content: CC BY 4.0, see [CONTENT-LICENSE](CONTENT-LICENSE).

By contributing you agree your work is released under these licences.
