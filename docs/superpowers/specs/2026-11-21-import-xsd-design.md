# import-xsd.ts design (T-031, T-032)

Status: written by the agent without a live approval round (the user asked for an unattended Phase 2 run). Calls marked **[call]** are the agent's; the project owner can reverse them in the PR.

## Intent
Turn an ISO 20022 message XSD (pacs.008.001.NN) into `src/data/schema/<id>.json`, the generated schema the site reads ([[Project Plan]] section 3). Teaches nothing itself; it is the data source for the tree, element panel and checks.

## Goals
- Deterministic: same XSD gives byte-identical JSON (stable key order, 2-space indent, trailing newline).
- Handles the constructs ISO XSDs use: `xs:complexType` with `xs:sequence`, `xs:choice`, `minOccurs`/`maxOccurs` (incl. `unbounded`), `xs:simpleType` restrictions (`base`, `minLength`, `maxLength`, `pattern`, `enumeration` codes), `xs:element` with `type`, `xs:documentation` carrying `Name = ...` and `Definition = ...`, `xs:extension`/`simpleContent` for amount types with a currency attribute, the root `Document` element.
- Unknown constructs **fail loudly**: any element/attribute/facet the importer does not model throws with the construct name and its location (type name). No silent skipping. `xs:any` (SupplementaryData envelope) is modelled explicitly as `{ any: true }`, not skipped. **[call]**
- Output validated by a zod schema before it is written.

## Non-goals
- No full XSD validator; no `xs:import`/`xs:include` resolution (ISO message XSDs are single files); no UI; no overlay; no `schema diff` (T-102).
- No committed XSD or generated JSON ([[ADR-012 XSD not committed]]). Test fixtures are synthetic hand-written XSD snippets.

## Anti-goals
Silently producing a plausible but incomplete tree; hand-editing the output.

## Constraints
- CLI: `node scripts/import-xsd.ts <xsd-path> [out-dir]`, output name from the schema's `Document` namespace id (`pacs.008.001.NN`) **[call]**. `npm run import-xsd` runs it; `npm test` runs its test.
- Node 24 native type stripping (no TS enums or parameter properties). Strict TS.
- Public ISO text only; fixtures contain invented names/definitions.

## Output shape
As in Project Plan section 3: `id`, `root`, `complexTypes{ name: { isoName, definition, elements[{tag, isoName, type, min, max, definition}], choice } }`, `simpleTypes{ name: { base, minLength?, maxLength?, pattern?, codes?, ... } }`. `max` is a number or `"unbounded"` **[call]**. Elements of a choice keep `min`/`max` per branch and the type has `choice: true`.

## Approaches
1. **Parse with a small XML library (fast-xml-parser) and walk the tree** (chosen **[call]**): one devDependency, handles entities/namespaces/CDATA correctly, `preserveOrder` keeps element order (order matters in a sequence).
2. Hand-written regex/tokenizer: no dependency, but fragile on entities, comments and attribute order; rejected.
3. Shell out to `xmllint`/libxml: not available on Windows dev machines; rejected.

## Left to the builder
Exact zod schema file location (suggested `scripts/schema-model.ts`, so the later content checks can import it); whether `zod` comes from `astro/zod` or a devDependency (check which imports under plain `node`); how `Name =`/`Definition =` documentation strings are split.
