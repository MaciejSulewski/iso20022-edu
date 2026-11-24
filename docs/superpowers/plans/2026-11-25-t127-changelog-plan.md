# T-127 changelog page: plan

Spec: [[2026-11-25-changelog-design]]. Branch `feat/t-127-changelog` (already checked out). Two tasks.

## Global Constraints

- **Stack and rules:** as in `CLAUDE.md`.
  - Strict TypeScript, Astro content collections, zod schemas in `src/lib/content-schemas.ts`.
  - UI text only through `t()` and `src/i18n/ui.en.json`.
  - Tailwind with the existing tokens (`text-muted`, `border-line`, `bg-surface`).
  - No new dependency.
- **Follow the glossary and quiz patterns**, and read them first: `src/lib/glossary.ts` and its test, `src/pages/glossary/index.astro`, the glossary and quiz rules in `scripts/check-content.ts` and its test, and `scripts/check-glossary.ts`.
- **Browser checks** wait with `settled()` / `verifying()` from `scripts/ui-wait.ts`. Expected values come from the YAML files, never from the page. Timeouts fail loudly.
- **New checks:** every new check, test or rule is shown failing once against a deliberate break, then restored. Say in the report how each one failed.
- **Content:** changelog entries state only facts from `docs/plan/Ledger.md` Done lines (dates and features). No ISO definitions, no new claims.
- **Commits:**
  - The trailer is two lines: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, then `Claude-Session: https://claude.ai/code/session_01Tm6fHX6ekSKBAMT9V9XNei`.
  - Conventional Commits, small commits.
  - Stage specific files only, never `git add -A`.
  - Do not push, open PRs or merge. Do not dispatch subagents. LF line endings.
- **Before reporting:** run `npm run verify` once at the end of Task 2 and give each gate's exit code. Never run two builds at once.

## Task 1: data, rules, logic

**Files:**
- `src/lib/content-schemas.ts`: `ChangelogSchema`;
- `src/content.config.ts`: the `changelog` collection;
- `src/content/changelog/*.yaml`: the four seed entries in the spec, ids `2026-11-22-workspace-and-lessons`, `2026-11-23-mapping-glossary`, `2026-11-24-quiz`, `2026-11-25-changelog`;
- `scripts/check-content.ts` and its test: the rules in the spec;
- `src/lib/changelog.ts` and `src/lib/changelog.test.ts`: `sortEntries`;
- `package.json`: add the test file to `test`;
- `src/lib/content-schemas.test.ts`: the schema accepts a valid entry and rejects an unknown key and a bad date.

The seed summaries: one to three plain sentences each, naming what a reader can now use and where. For example: "The pacs.008.001.14 workspace: an annotated synthetic message, the full schema tree and a details pane, with a second sample...". Name the 2026-11-22 to 2026-11-24 entries' messages as `[pacs.008.001.14]`, and the 2026-11-25 entry's as `[]`.

## Task 2: page, footer, docs, browser check

**Files:**
- `src/pages/changelog/index.astro`: as the spec says. Message links go to `${base}messages/<id>/`; read how the workspace route builds that path.
- `src/layouts/Base.astro`: footer link with key `footer.changelog`, text "Changelog".
- `src/i18n/ui.en.json`: `changelog.title` "Changelog" and `changelog.lead`, plain and short.
- `scripts/check-changelog.ts`, added to the end of `check:ui` in `package.json`: the checks in the spec.
- `docs/maintenance.md`: step 8 only.
- `.claude/skills/add-message/SKILL.md`: add a step "add a changelog entry" where the skill finishes a message. Read the skill first and match its style.
- `docs/decisions/ADR-021 Changelog as YAML content.md`: in the style of ADR-019, with the status "accepted 2026-11-25".
- `docs/plan/Ledger.md`: add `- [[ADR-021 Changelog as YAML content]]` under Decisions only. Do not tick T-127.
