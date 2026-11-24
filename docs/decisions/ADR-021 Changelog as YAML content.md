# ADR-021 Changelog as YAML content

Status: accepted 2026-11-25.

**Decision.** Each changelog entry is one YAML file in `src/content/changelog/`, named `YYYY-MM-DD-slug.yaml` (id, date, one-line title, a plain-text summary of one to three sentences, and the message ids it concerns), validated by a strict zod schema and by `check-content`: the id matches the file name, the date matches the id prefix, and every message id exists. The page `/changelog/` is static with no island; a pure function (`src/lib/changelog.ts`) sorts the entries newest first, then by id. Every page links it from the footer.

**Why.** Same rule as flows, the glossary and the quiz ([[ADR-017 Flows as YAML content]], [[ADR-018 Glossary as YAML content]], [[ADR-019 Quiz as YAML content]]): content is checked data. One file per entry means two branches that each add an entry never conflict. [[maintenance]] step 8 and the `add-message` skill now say where an entry goes. The browser check reads the expected order from the YAML, never from the page.

**Consequences.** Entries are facts about the site, not teaching text, so the page is not draft-marked and needs no `#me` review. The summary is plain text, so an entry cannot hold links beyond its message ids. No rule rejects future dates, so the build never depends on the clock. No RSS feed, per-entry pages or tags. Design: [[2026-11-25-changelog-design]].
