# Phase 3 foundations plan (T-040, T-041, T-038, T-043)

Spec: none needed ([[ADR-011 Process per task]]: config and tooling tasks). Ledger lines in `docs/plan/Ledger.md` are the acceptance criteria.

## Global constraints

- Node >= 24.2, TypeScript strict, tests run by `node --test file.ts` (native type stripping, no build step, so use `.ts` import extensions and no enums or parameter properties).
- Content rules: synthetic data only (fictional BICs such as `TESTGB2LXXX`, test IBANs), public sources only, never hand-edit `src/data/schema/*.json` or `src/data/erepository/*.json`.
- Code is written in ponytail `full` mode: smallest complete change, no extra options, one small test per non-trivial piece.
- `npm test`, `npm run lint`, `npm run format:check`, `npm run build` must pass. CI has no eRepository, so tests may not need it.
- JS budget `npm run check:size` and the axe check stay green.
- Conventional Commits, small commits, no push to `main`.

### Task 1: T-040 synthetic pacs.008.001.14 sample plus xmllint in CI

Create `src/content/samples/pacs.008-basic.xml`: a single-transaction pacs.008.001.14 (charge bearer SHAR, debtor agent to creditor agent, fictional BICs, test IBANs, a comment in the file saying the data is fictional). It must be valid under `xmllint --noout --schema schemas/pacs.008.001.14.xsd`. Respect the business rules listed in `src/data/schema/pacs.008.001.14.json` `constraints` (for example a group-level settlement date means none per transaction).

Add `npm run check:xml` (one script or a tiny `scripts/` helper only if a one-line `xmllint` call over `src/content/samples/*.xml` cannot do it) and an xmllint step in `.github/workflows/ci.yml` (ubuntu runners need `sudo apt-get install -y libxml2-utils` if xmllint is absent). CI must fail on an invalid sample: show it locally by breaking the sample (for example remove `MsgId`) and recording that the command exits non-zero, then restore it.

Done when: the sample validates, the CI step exists, and breaking the sample makes the command fail.

### Task 2: T-041 zod content schemas in `src/content.config.ts`

Define Astro content collections with zod schemas: `messages` (id, family, name, purpose, mtEquivalent, sources[{title,url,retrieved}], lastReviewed{date,by}), `annotations` (message, byPath, byType, codes; shape per Project Plan section 3; localized text `{ en: string, pl?: string }`), `samples` (id, message, file, title, scenario). Content files are YAML under `src/content/` (the sample XML stays next to its `.yaml` metadata). Add `src/content/messages/pacs.008.001.14.yaml` and `src/content/samples/pacs.008-basic.yaml` and an `annotations/pacs.008.001.14.yaml` with a minimal valid header (empty `byPath`). Reuse `scripts/schema-model.ts` where it fits (do not duplicate shapes). Keep the zod pieces that `check-content` and tests also need exported from one importable module that does not require Astro (`scripts/` or `src/lib/`), since `node --test` cannot import `astro:content`.

Done when: a malformed content file (for example a missing `lastReviewed`) fails `npm run build`; show it and restore.

### Task 3: T-038 schema resolver in `src/lib/` plus unit tests

Build the smallest resolver over `src/data/schema/pacs.008.001.14.json`: `resolvePath(schema, "GrpHdr/MsgId")` returns the element (tag, isoName, definition, type, min/max, mandatory flag, the complex or simple type it points to, codes), path lookup from `root` (the message root's `Document/FIToFICstmrCdtTrf` handling is up to the implementer, document the choice in one line), type fallback (an element whose type is a complex type descends into it; the result carries the type name so overlay-by-type can be applied), choice elements (a complex type with `choice: true`: children are alternatives, flagged on the result), `xs:any` entries, unresolved paths return `undefined` rather than throw. Tests in `src/lib/resolver.test.ts` read the committed JSON (no eRepository). Add the test file to `npm test`.

Done when: tests cover path lookup, type fallback and choice elements.

### Task 4: T-043 `scripts/check-content.ts`

Checks, all failing with a non-zero exit and an actionable message: every element of every sample XML resolves in the schema (use the resolver); every `byPath` overlay key and every `byType`/`codes` key resolves; the sample metadata points to an existing message and file. Prints an annotation coverage report (share of distinct sample element paths with a `byPath` or `byType` overlay). Add `npm run check:content`, call it from `npm run build`'s chain or a CI step before build (CLAUDE.md says the build includes content checks), and add a test with a deliberately broken fixture overlay. Parse XML with `fast-xml-parser` (already a dev dependency), overlay YAML with the parser the content layer already uses (add `yaml` only if no parser is installed).

Done when: breaking an overlay path (or a sample element) fails the check; show it and restore.
