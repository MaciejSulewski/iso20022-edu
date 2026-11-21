# import-xsd plan (T-031, T-032)

Spec: `docs/superpowers/specs/2026-11-21-import-xsd-design.md` (binding). Global constraints: CLAUDE.md rules; ponytail full (smallest complete change, no unrequested features); synthetic fixtures only; generated files never hand-edited; Conventional Commits with the Co-Authored-By trailer given by the session; do not push, open PRs or tick the ledger; no subagents.

## Task 1: T-031 import-xsd.ts and test

Branch `feat/t-031-import-xsd` (already checked out; stacked on the T-030 branch).

Build `scripts/import-xsd.ts` per the spec, plus the zod model, plus a node:test file `scripts/import-xsd.test.ts` and a synthetic XSD fixture inline or under `scripts/fixtures/`.
1. Add `fast-xml-parser` (devDependency) and zod (via the cheapest working route, see spec). Add `import-xsd` npm script; extend `npm test` to also run the new test.
2. Export a pure function `importXsd(xsdText: string): Schema` (CLI wrapper separate and thin); the test calls it directly.
3. Test (TDD, one test per construct): sequence with min/max multiplicity (incl. `unbounded`), choice, simpleType with minLength/maxLength/pattern, enumeration codes, `xs:documentation` Name/Definition split, simpleContent extension (amount + currency attribute), `xs:any`, root resolution; deterministic output (run twice, equal); and **unknown constructs fail loudly** (at least: an unmodelled facet, an unmodelled child element such as `xs:all` or `xs:attributeGroup`, and a missing type reference) with a message naming the construct.
4. `npm test`, `npm run lint`, `npm run format:check` and `npm run build` must pass.
Done when: the test covers each construct and unknown constructs fail loudly (ledger T-031).

## Task 2: T-032 generate the pacs.008 JSON

Blocked on T-104 (XSD URL unknown): do not start; the controller reports it.
