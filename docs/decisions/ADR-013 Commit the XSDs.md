---
status: accepted
date: 2026-11-21
---
# ADR-013 Commit the XSDs

**Decision:** The official ISO 20022 pacs XSDs are committed unmodified in `schemas/`, with `THIRD-PARTY-NOTICES.md` at the repo root. The generated `src/data/schema/*.json` is committed too, as the original plan had it. Supersedes [[ADR-012 XSD not committed]].

**Why:** The project owner decided this (option 1 of the three in ADR-012). An automated download of the XSD zip returns HTTP 403, so "fetch in CI" cannot work. The IP policy and terms of use, as summarised in [[sources]], give a royalty-free licence to use published repository information and allow reproduction with a "not the official site" statement.

**Risk accepted:** The iso20022.org terms have still not been read from the primary pages (T-104), and the Swift-specific licence reportedly restricts sale and modification that keeps the Swift reference. Mitigations: the XSDs are committed unmodified; attribution and the "not affiliated" disclaimer are in `THIRD-PARTY-NOTICES.md` and the site footer ([[ADR-006 Licences]]); the repo is not sold. If a primary-page reading says otherwise, switch back to a local-only workflow.

**Consequences:**
- The XSD and JSON are third-party material and not under MIT or CC BY; `THIRD-PARTY-NOTICES.md` says so. Own code stays MIT, own content CC BY 4.0.
- T-105 (fetch script) is cancelled. T-032 is unblocked.
- `schemas/` holds eight pacs XSDs (the contents of the iso20022.org zip); only pacs.008.001.14 is in scope ([[ADR-004 Scope pacs.008]]).
