# T-127 changelog page: design

Ledger task T-127. Complex per [[ADR-011 Process per task]]: a new data format (a content collection). Decided without a live approval round; every **[call]** is mine.

## Intent

[[maintenance]] step 8 says "add a changelog entry on the site", and no page exists for it. Readers (new bank staff) and the owner need one place that says what changed on the site and when: a new message version, new content, a fix to the teaching text.

## Design

**Data** (`src/content/changelog/<id>.yaml`, one file per entry **[call]**, so two branches adding entries never conflict; strict zod `ChangelogSchema`):
- `id`: the file name, `YYYY-MM-DD-slug`.
- `date`: the same day as the id prefix, using the existing `day` format.
- `title`: one line.
- `summary`: one to three sentences, plain text, no Markdown **[call]**: keeps the schema and the page simple.
- `messages`: message ids the entry concerns, for example `pacs.008.001.14`. Defaults to `[]` **[call]**, for maintenance entries that change a message version.

**check-content rules:**
- each file parses;
- `id` matches the file name;
- `date` equals the id's date prefix;
- every `messages` id exists in the messages collection;
- the count is printed (`Changelog: N`).

No rule against future dates **[call]**: it would make the build depend on the clock.

**Logic** (`src/lib/changelog.ts`, pure, unit tested): `sortEntries(entries)` puts the newest date first, and on the same date sorts by id descending, so the order is stable.

**Page** `/changelog/` (`src/pages/changelog/index.astro`, static, no island):
- an h1 and a one-line lead;
- one `<article>` per entry: an h2 title, a `<time datetime>` date, the summary, and links to each named message's workspace page.

The page is not draft-marked: entries are facts about the site, not teaching text **[call]**, so there is no `#me` review task. A footer link "Changelog" on every page sits next to the licence links **[call]**. Pagefind indexes the page like any other.

**Seed entries** (facts from the [[Ledger]] Done list only, no new claims):
- 2026-11-22: the pacs.008.001.14 workspace with an annotated sample, a schema tree and a details pane; a second sample; Ctrl+K search; six lessons and Start here; the agent-chain flow.
- 2026-11-23: the flow animation (respecting reduced motion); the MT 103 mapping table; the glossary.
- 2026-11-24: the quiz.
- 2026-11-25: this changelog page, and the Start here step numbers fix (PR #68).

The earlier 2026-11-21 scaffold work is folded into the first entry **[call]**: before 2026-11-22 the site had only a landing page.

**Docs:**
- [[maintenance]] step 8 becomes: add `src/content/changelog/YYYY-MM-DD-slug.yaml`, which shows on `/changelog/`.
- The `add-message` skill gains a changelog step.
- New ADR: [[ADR-021 Changelog as YAML content]].

**Checks:**
- check-content tests for each rule;
- `src/lib/changelog.test.ts`;
- `scripts/check-changelog.ts` in `check:ui`. Its expected values are read from the YAML files, not the page:
  - every entry is shown, in the sorted order, with its `datetime`;
  - the footer link on the home page leads to `/changelog/`;
  - no sideways page scroll at 320 px.
- `check:a11y` covers the new page automatically.
- Every new check is shown failing once.

## Not doing

- No RSS feed, no per-entry pages, no tags or kinds, no "new" badge, no link to git history.
