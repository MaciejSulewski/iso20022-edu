# T-060 Overlay by type and code explanations: plan

Ledger task: T-060 (Phase 5). Simple task, no separate spec ([[ADR-011 Process per task]]); this plan is the spec.

**Goal.** A shared component type (for example the agent block used 17 times) gets one plain-English overlay entry in `byType`, used wherever the type appears and no `byPath` entry exists. Code lists get a plain-English explanation per code (`codes`), shown beside the ISO name and definition of each code.

**What already exists (do not rebuild).** `AnnotationSchema` in `src/lib/content-schemas.ts` already has `byType` and `codes`. `check-content.ts` already fails on a `byType` key that is not a complex type, and on a `codes` key or code that is not in the schema. `buildTree` (`src/lib/xml-tree.ts`) and `toXmlNode` (`src/lib/tree-view.ts`) already fall back from `byPath` to `byType`. The `codes` map is NOT read anywhere yet, and the YAML has no `byType` or `codes` entries yet.

**Global constraints (apply to every task).**

- Own wording, written beside the official ISO definition that the panel already shows. Do not paraphrase the ISO definition closely; reviewers check for copied wording. Base ISO 20022 only (no CBPR+ rules). Synthetic data only.
- Never hand-edit `src/data/schema/*.json`.
- A `byType` text describes the type for any place it appears, so it must not say "the debtor's bank"; say what the block is and that the surrounding element name gives the role.
- Every new check must be shown failing once against a deliberate break, then restored. Browser checks wait with `settled()` from `scripts/ui-wait.ts` before reading text after an action.
- Conventional Commits, small commits, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Stage specific files only.
- Run `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` before reporting done.

## Task 1: Show code explanations in the details panel

Files: `src/lib/content-schemas.ts` (no change expected), `src/lib/xml-tree.ts`, `src/lib/tree-view.ts`, `src/components/ElementPanel.tsx`, `src/pages/messages/[id].astro`, `src/i18n/ui.en.json`, tests in `src/lib/xml-tree.test.ts` and `src/lib/tree-view.test.ts`, browser check in `scripts/check-annotated-xml.ts` or `scripts/check-schema-tree.ts`.

1. Widen the `Overlay` type (`Pick<..., "byPath" | "byType" | "codes">`). `codes` has a default of `{}`, so the type is always present on parsed data. Pass `codes` in the `overlay` object built in `[id].astro`. Check that the island's overlay prop type accepts it (`Workspace.tsx`).
2. In `info.codes` entries add an optional `explanation?: string`. When the element's simple type name has `overlay.codes[typeName][code]`, set `explanation` to its `.en`. Do this in both `buildTree` and `toXmlNode`; put the merge in one small shared helper (for example in `xml-tree.ts`, imported by `tree-view.ts`) rather than copying it.
3. `ElementPanel.tsx`: for each code show the code, the ISO name, and the ISO definition as today; show the explanation as its own line under the definition, labelled by a new i18n key (`xml.panel.codeExplained`, English text "In plain words:"). No colour-only distinction. Keep the existing look otherwise.
4. Tests: a code with an overlay explanation gets it, a code without one has none, a type without a `codes` entry is unchanged; same for both `buildTree` and `toXmlNode`. Show each test failing once against a break.
5. Browser check: after Task 2's content lands, selecting `CdtTrfTxInf/ChrgBr` shows the explanation for `SHAR` in the panel; selecting it from the tree pane shows it too. Write the check in this task against a throwaway fixture only if needed; otherwise finish it in Task 2 (the content must exist first). State in the report which.

Done when: unit tests pass and the panel renders an `explanation` when present.

## Task 2: Overlay content for shared types and codes

Files: `src/content/annotations/pacs.008.001.14.yaml` (append new top-level `byType:` and `codes:` keys after `byPath`), `scripts/check-content.ts` and its test, a browser check.

1. `byType` entries (one each, 2 to 4 sentences, generic wording) for these complex types of `pacs.008.001.14`, all used in two or more places: `BranchAndFinancialInstitutionIdentification8`, `CashAccount40`, `ActiveOrHistoricCurrencyAndAmount`, `ActiveCurrencyAndAmount`, `PartyIdentification272`, `PostalAddress27`, `PaymentTypeInformation28`, `ServiceLevel8Choice`, `LocalInstrument2Choice`, `CategoryPurpose1Choice`, `TaxData1`, `SupplementaryData1`. Read each type's ISO definition in `src/data/schema/pacs.008.001.14.json` (`complexTypes.<name>`, and the definition on the element that uses it) before writing; do not copy it. Existing `byPath` entries still win where they exist (for example `CdtTrfTxInf/Dbtr`).
2. `codes` entries (one line each, own wording) for the code lists the sample uses or that appear in the shared blocks above: `SettlementMethod1Code`, `ChargeBearerType1Code`, `Priority2Code`, `Priority3Code`, `ClearingChannel2Code`, `CreditDebitCode`. Every code in each list gets an entry; `check-content` already rejects unknown codes.
3. `check-content.ts`: print one more summary line, `Shared types: N of M overlaid`, where M is the number of complex types that two or more elements use, and N how many have a `byType` entry (compute from `schema.complexTypes`; keep it pure and covered by a test in `check-content.test.ts`). It reports only; it does not fail. Show the test failing once.
4. Browser check (in `scripts/check-schema-tree.ts` or `check-annotated-xml.ts`, whichever has the helpers): open the tree pane, expand `CdtTrfTxInf` and select `CdtTrfTxInf/IntrmyAgt1` (an element with no `byPath` entry whose type is `BranchAndFinancialInstitutionIdentification8`): the panel shows the shared-type explanation, and the same text shows for `CdtTrfTxInf/PrvsInstgAgt1`. Select `CdtTrfTxInf/ChrgBr` in the XML pane: the panel shows the explanation of `SHAR`. Use `settled()`. Show both checks failing against a break (for example by deleting the `byType` key), then restore.
5. Record sources: no new public source is expected (the overlay text is own wording over the ISO definitions already in `docs/sources.md`). If you used any other source, add it to `docs/sources.md`.

Done when: `npm run build` passes, `check-content` prints the new summary line, the browser checks pass, and every listed type and code list has an entry.
