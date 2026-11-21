---
status: accepted
date: 2026-11-21
---
# ADR-005 Full message tree generated from XSD

**Decision:** Every element is explorable. The structure is generated from the official XSD by scripts/import-xsd.ts; hand-written explanations live in a YAML overlay keyed by path or by type.

**Why:** Hand-typing hundreds of elements is error-prone and must be redone every version; generating makes yearly updates a diff.

See [[Project Plan]].
