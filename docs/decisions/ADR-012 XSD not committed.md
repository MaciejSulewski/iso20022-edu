---
status: accepted
date: 2026-11-21
---
# ADR-012 XSD not committed

**Decision:** The ISO XSDs and the generated `src/data/schema/*.json` (which embed ISO definitions) are not committed. They are fetched and generated in CI and locally.

**Why:** The iso20022.org terms could not be read (HTTP 403), and search summaries show no explicit licence for the XSD files. The plan says to take the conservative option when terms are unclear. See [[sources]].

**Alternatives:** commit them under attribution (rejected until the terms are read and clearly allow it).

**Consequences:** Refines [[ADR-006 Licences]]. Own content stays CC BY 4.0; ISO definitions shown on pages keep attribution and the "not the official site" notice. Reopen when the user has read the terms in a browser. See [[Project Plan]] sections 6 and 7.
