# T-080 MT 103 to pacs.008 mapping: plan

Spec: [[2026-11-23-mapping-design]]. Branch `feat/t-080-mt103-mapping`. Two tasks, in order.

## Global Constraints

- Stack and rules as in `CLAUDE.md`: Astro, Preact, Tailwind v4, strict TypeScript, zod; all UI text through `t()` and `src/i18n/ui.en.json`; code MIT, content CC BY 4.0.
- Content: public sources only, own wording, no CBPR+ rules, no claims beyond the two sources named in the spec. The mapping data file in Task 1 is verbatim: do not add, reword into stronger claims, or "complete" rows from your own knowledge of MT 103.
- Every new check must be shown failing once against a deliberate break, then restored. Browser checks wait with `settled()` from `scripts/ui-wait.ts` before reading position, focus, scroll or text after an action. No swallowed timeouts.
- The commit trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Conventional Commits, small commits. Stage specific files only. Do not push, merge or touch `docs/` files other than those named. Do not dispatch subagents.
- Run before reporting: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` (give exit codes).

## Task 1: data format, content file, check-content rules

**Files:** `src/lib/content-schemas.ts`, `src/content.config.ts`, `src/content/mappings/mt103-pacs.008.yaml` (new), `scripts/check-content.ts`, `scripts/check-content.test.ts`.

1. `MappingSchema` (strict) in `src/lib/content-schemas.ts`, shape per the spec: `id`, `message`, `title`, `summary`, `lesson`, `sources` (the existing `Sources`), `lastReviewed` (`Reviewed`), `rows[]` (`field` string, `fieldName?`, `paths` min 1, `codeList?`, `codes?` array of `{mt, iso}`, `note?`, `sources` array of int min 1), `additions[]` (`paths` min 1, `note`, `sources` int array min 1). A `mappings` collection in `src/content.config.ts` (yaml loader, `src/content/mappings`).
2. Create `src/content/mappings/mt103-pacs.008.yaml` with exactly this content:

```yaml
id: mt103-pacs.008
message: pacs.008.001.14
title: MT 103 fields and pacs.008 elements
summary: Which pacs.008 elements correspond to which MT 103 fields, as far as two public sources say. A partial table, not an official mapping.
lesson: from-mt103
sources:
  - title: A deep dive on pacs.008 (BNY, February 2021)
    url: https://www.bny.com/content/dam/bnymellon/documents/pdf/iso-20022/learning-guide-module4.pdf
    retrieved: "2026-11-23"
  - title: MT103 mapping (Ripple documentation)
    url: https://docs.ripple.com/products/payments-odl/api-docs/ripplenet/resources/srpo/mt103-mapping
    retrieved: "2026-11-23"
lastReviewed:
  date: "2026-11-23"
  by: unreviewed (AI-drafted, pending T-081)
rows:
  - field: "20"
    fieldName: Sender's Reference
    paths: [CdtTrfTxInf/PmtId/InstrId]
    note: Both sources pair this field with the instruction identification.
    sources: [0, 1]
  - field: "121 (block 3)"
    paths: [CdtTrfTxInf/PmtId/UETR]
    note: The BNY paper says the UETR travels in field 121 of block 3 in MT messages.
    sources: [0]
  - field: 32a
    paths: [CdtTrfTxInf/IntrBkSttlmAmt, CdtTrfTxInf/IntrBkSttlmDt, GrpHdr/IntrBkSttlmDt]
    note: One MT field holds currency, amount and date; pacs.008 has separate elements for the amount and for the date. The source does not say which of the two date elements to use, and this schema version has the date in both places.
    sources: [0]
  - field: 50a
    paths: [CdtTrfTxInf/Dbtr]
    note: Ripple's table, which targets its own payment object and not a pacs.008, takes the debtor name from 50K and the address from 50K or 50F.
    sources: [0, 1]
  - field: 52a
    paths: [CdtTrfTxInf/DbtrAgt]
    note: The debtor agent.
    sources: [0]
  - field: 53a
    paths: [GrpHdr/SttlmInf/InstgRmbrsmntAgt]
    note: The instructing reimbursement agent.
    sources: [0]
  - field: 54a
    paths: [GrpHdr/SttlmInf/InstdRmbrsmntAgt]
    note: The instructed reimbursement agent.
    sources: [0]
  - field: 55a
    paths: [GrpHdr/SttlmInf/ThrdRmbrsmntAgt]
    note: The third reimbursement agent.
    sources: [0]
  - field: 56a
    paths: [CdtTrfTxInf/IntrmyAgt1]
    note: The first intermediary agent. pacs.008 also has second and third intermediary agents, which have no MT field (see the second table).
    sources: [0]
  - field: 57a
    paths: [CdtTrfTxInf/CdtrAgt]
    note: The creditor agent.
    sources: [0]
  - field: 59a
    paths: [CdtTrfTxInf/Cdtr]
    note: Ripple's table takes the creditor name from 59 and the address from 59 or 59F.
    sources: [0, 1]
  - field: 23E
    paths: [CdtTrfTxInf/InstrForCdtrAgt]
    note: Instructions to the creditor agent, such as holding the cash for the creditor.
    sources: [0]
  - field: 70
    fieldName: Remittance Information
    paths: [CdtTrfTxInf/RmtInf/Ustrd]
    note: Only Ripple's table gives this pairing.
    sources: [1]
  - field: 71a
    fieldName: Details of Charges
    paths: [CdtTrfTxInf/ChrgBr]
    note: Three of the four charge codes pair with a 71a value. The BNY paper lists the fourth, SLEV, as new, for schemes with a common service agreement, and not for cross-border payments.
    codeList: ChargeBearerType1Code
    codes:
      - { mt: BEN, iso: CRED }
      - { mt: OUR, iso: DEBT }
      - { mt: SHA, iso: SHAR }
    sources: [0, 1]
additions:
  - paths: [CdtTrfTxInf/UltmtDbtr, CdtTrfTxInf/UltmtCdtr, CdtTrfTxInf/InitgPty]
    note: The ultimate debtor, the ultimate creditor and the initiating party. The BNY paper says three of the five parties are new and names the two ultimate parties as new. It gives no MT field for the initiating party, the party at whose initiative the payment data is established.
    sources: [0]
  - paths: [CdtTrfTxInf/IntrmyAgt2, CdtTrfTxInf/IntrmyAgt3]
    note: Second and third intermediary agents. The BNY paper says MT messages have no dedicated field for them.
    sources: [0]
  - paths: [CdtTrfTxInf/PrvsInstgAgt1, CdtTrfTxInf/PrvsInstgAgt2, CdtTrfTxInf/PrvsInstgAgt3]
    note: Previous instructing agents 1 to 3, which the BNY paper says have dedicated fields in pacs.008.
    sources: [0]
  - paths: [CdtTrfTxInf/InstgAgt, CdtTrfTxInf/InstdAgt]
    note: The instructing and the instructed agent. The BNY paper calls this a new concept, so that sender and receiver also sit in the payload and not only in the header.
    sources: [0]
  - paths: [CdtTrfTxInf/DbtrAcct/Tp, CdtTrfTxInf/DbtrAcct/Ccy, CdtTrfTxInf/DbtrAcct/Nm, CdtTrfTxInf/DbtrAcct/Prxy]
    note: Account type, currency, a chosen name and a proxy. The BNY paper says the account structure is richer than in the MT messages and that these four are new.
    sources: [0]
  - paths: [CdtTrfTxInf/PmtId/TxId]
    note: The transaction identification, which the BNY paper calls new. It is allocated by the debtor agent and carried to the creditor agent unchanged.
    sources: [0]
  - paths: [GrpHdr/SttlmInf/SttlmMtd]
    note: The settlement method, with a code that says how the payment is settled. The BNY paper calls it a new feature.
    sources: [0]
  - paths: [CdtTrfTxInf/ChrgsInf]
    note: Charge information, the amount of charges taken and the agent that took them. The BNY paper calls it new.
    sources: [0]
  - paths: [CdtTrfTxInf/InstrForNxtAgt]
    note: An instruction from the sender to the next agent in the chain. The BNY paper calls it new.
    sources: [0]
  - paths: [CdtTrfTxInf/RmtInf/Strd]
    note: Structured remittance information. The BNY paper says it is new compared with the MT messages and that its use has to be agreed between the parties.
    sources: [0]
  - paths: [CdtTrfTxInf/RltdRmtInf]
    note: Related remittance information, which lets remittance data travel outside the payment instruction. The BNY paper calls it brand new.
    sources: [0]
```

3. `check-content` (`Input` gets `mappings?: File[]`, loaded in `main` from `src/content/mappings` like flows; the return value gets `mappings: number`, printed as `Mappings: N`): per file, parse with `MappingSchema`; id equals file name; `message` equals the schema id; `lesson` is a lesson id; every path in `rows` and `additions` resolves; no path appears twice across both tables; no `field` twice; each `codes[].iso` is a code of `schema.simpleTypes[codeList]` (error if `codeList` is missing when `codes` is set, or the list is unknown); every `sources` index is within the top-level `sources`; every top-level source is used by at least one row or addition.
4. Tests in `scripts/check-content.test.ts` for each rule (one failing case each, plus the real file passing through the existing "real content" test if there is one). Show each new rule failing against a break in the real YAML once (path typo, code `CREDX`, source index 5, duplicate path), then restore.

**Done when:** `npm test`, lint, format, build pass; `check:content` prints `Mappings: 1`; each rule is shown failing.

## Task 2: the page, wiring, lesson text, checks

**Files:** `src/pages/mappings/[id].astro` (new), `src/i18n/ui.en.json`, `src/lib/lesson-tools.ts`, `src/pages/lessons/[slug].astro` only if needed, `src/content/lessons/en/from-mt103.md`, `docs/sources.md`, `scripts/check-mapping.ts` (new), `scripts/check-lessons.ts`, `package.json` (`check:ui`).

Use `frontend-design:frontend-design` for the page; follow the existing look (`src/pages/flows/[id].astro`, Tailwind tokens, `text-muted`, `border-line`, `bg-surface`). Static page, no island, no new client JS.

1. Page at `/mappings/<id>/` from the `mappings` collection: `h1`, summary, draft notice (`mapping.draft`: "AI-drafted from two public sources, not yet reviewed by a person (T-081). Do not rely on it for real payments."), a short "what this table is" paragraph (`mapping.about`: it is partial; the two sources are a bank's explainer written for the CBPR+ rollout and a vendor's table for its own payment object; neither is an official mapping; the bank paper calls pacs.008 the equivalent of MT 103, MT 103+, MT 103 Remit, MT 102 and MT 102+, so its pairings are for that family, not for MT 103 alone; a field missing here is one these sources do not cover; element names are those of pacs.008.001.14 and every one exists in the schema), table 1 (caption, columns MT 103 field / pacs.008 elements / Note / Source), the charge codes shown inside the 71a row as "BEN becomes CRED" etc. (from `codes`), table 2 (caption "Elements with no MT field named in the sources": columns Elements / Note / Source), sources list, link back to lesson 5. Element cells link to `${base}messages/${message}/#${path}` and show the path. The source column shows "BNY" / "Ripple" short names derived from the numbering: use "Source 1", "Source 2" linking to the anchor of that source in the list (the number is the list position, so rows and list agree). Each table sits in a scroll region (`role="region"`, `aria-labelledby` its caption, `tabindex="0"`, `overflow-x-auto`); the page itself must not scroll sideways at 390 px.
2. `lesson-tools.ts`: `mapping: "mappings/mt103-pacs.008/"`; `toolLabelKey("mapping")` returns a new `lesson.toolMapping` ("Open the mapping table"). Start here step 5 then links the page automatically (check `src/pages/index.astro`).
3. Lesson 5 (`from-mt103.md`): replace the paragraph "This lesson does not list MT 103 fields..." with one that points to the mapping table, says it rests on two public sources (a bank explainer and a vendor table, neither official), is partial and unreviewed until T-081, and that this lesson itself still gives no MT 103 field facts; change the last check question to something answerable from the lesson and the table (for example which source supports the field 70 pairing); add the BNY source to the lesson's `sources` with retrieved 2026-11-23. No claim beyond the table.
4. `docs/sources.md`: add rows for the BNY paper and the Ripple page (what each was used for, read directly: pdftotext of the PDF; the page's markdown export), retrieved 2026-11-23; note in "Not used" that the JPMorgan guide stays unused. Do not touch other rows.
5. `scripts/check-mapping.ts` (add to `check:ui`, same style as `check-flow.ts`): at 1280 and 390, the page has the draft notice text and both tables; table row counts equal the YAML's `rows` and `additions` counts (read the YAML in the script); at 1280 clicking the first element link of the `20` row lands on the workspace with `CdtTrfTxInf/PmtId/InstrId` selected (use `settled`); at 390 `document.documentElement.scrollWidth <= innerWidth`; Start here step 5 and lesson 5 link the page (update `check-lessons.ts` TOOLS and its link-text expectation: step `mapping` reads "Open the mapping table" and goes to `${BASE}mappings/mt103-pacs.008/`). Show each check failing once (drop a row from the YAML, break the link target, widen a table with `min-w` outside its region), then restore.
6. Axe: `check:a11y` already scans every built page; it must pass for the new page in light and dark at both widths.

**Done when:** the page builds and is linked from Start here step 5 and lesson 5; every new check was shown failing; all seven commands from Global Constraints exit 0; JS size of the new page is only the base layout's.
