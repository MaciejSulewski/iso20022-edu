---
status: accepted
date: 2026-11-21
---
# ADR-013 Commit the XSDs

**Decision:** The official ISO 20022 pacs XSDs are committed unmodified in `schemas/`, with `THIRD-PARTY-NOTICES.md` at the repo root. The generated `src/data/schema/*.json` is committed too, as the original plan had it. Supersedes [[ADR-012 XSD not committed]].

**Why:** The project owner decided this (option 1 of the three in ADR-012). An automated download of the XSD zip returns HTTP 403, so "fetch in CI" cannot work. The IP policy and terms of use, as summarised in [[sources]], give a royalty-free licence to use published repository information and allow reproduction with a "not the official site" statement.

**Risk, checked 2026-11-21 (T-104):** The primary pages were read: terms of use, IP policy and the Swift end-user licence (see [[sources]], "Primary reading"). They allow free reproduction and royalty-free use, and forbid selling the standards or modifying them while keeping the "SWIFTStandards" name. The XSDs are committed unmodified and free of charge; `THIRD-PARTY-NOTICES.md` carries the attribution, the "not the official site" statement and a note that the generated JSON is derived, not official. Remaining risk: other contributors (such as CBI) may have their own terms; the CBI policy was not read. If one of them forbids redistribution, switch back to a local-only workflow.

**Consequences:**
- The XSD and JSON are third-party material and not under MIT or CC BY; `THIRD-PARTY-NOTICES.md` says so. Own code stays MIT, own content CC BY 4.0.
- T-105 (fetch script) is cancelled. T-032 is unblocked.
- `schemas/` holds eight pacs XSDs (the contents of the iso20022.org zip); only pacs.008.001.14 is in scope ([[ADR-004 Scope pacs.008]]).
