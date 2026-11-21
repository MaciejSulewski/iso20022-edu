---
status: accepted
date: 2026-11-21
---
# ADR-012 XSD not committed

**Decision:** The ISO XSDs and the generated `src/data/schema/*.json` (which embed ISO definitions) are not committed. They are fetched and generated in CI and locally.

**Why:** The iso20022.org terms could not be read (HTTP 403), and search summaries show no explicit licence for the XSD files. [[Project Plan]] section 6 names fetching the XSD in CI as the fallback if the terms do not allow committing it. See [[sources]].

**Alternatives:** commit them under attribution (rejected until the terms are read and clearly allow it).

**Consequences:** Refines [[ADR-006 Licences]]. Own content stays CC BY 4.0; ISO definitions shown on pages keep attribution and the "not the official site" notice. Reopen when the project owner has read the terms in a browser (T-104). See [[Project Plan]] sections 6 and 7.

Follow-ups: a fetch script for the XSD (T-105), a fetch and generate step in `npm run build` and CI, and `.gitignore` entries for the XSD and `src/data/schema/*.json`. Showing single definitions on pages with attribution is judged lower risk than committing the whole XSD or JSON (a quotation of a few definitions beside own text, not a redistribution of the schema); this is covered by the same re-check in T-104.
