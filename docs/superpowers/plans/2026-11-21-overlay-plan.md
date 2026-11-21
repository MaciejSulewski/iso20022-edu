# Overlay for the key pacs.008 elements (T-044)

Ledger line: "Overlay for about 30 key elements. Done when: coverage report shows them annotated". No spec needed ([[ADR-011 Process per task]]: content task, no new format).

## Global constraints

- Content rules (CLAUDE.md): base ISO 20022 only, no CBPR+ or Swift usage rules; public sources only, each recorded in `docs/sources.md`; own wording beside the official ISO definition (the panel already shows the official definition from the generated schema, so do not copy it); synthetic data only; examples must come from `src/content/samples/pacs.008-basic.xml` or be clearly fictional.
- Accuracy over volume: say only what the ISO definition in `src/data/schema/pacs.008.001.14.json` (and general, widely documented payments knowledge) supports. If unsure, say less. Never invent rules, limits or field lengths. Content is AI-drafted and unreviewed (T-045/T-093 are the user's); do not claim otherwise.
- Shape: `src/lib/content-schemas.ts` AnnotationSchema (localized text `{ en: string }`, byPath, byType, codes). Dates and strings quoted in YAML.
- `npm run check:content`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` pass.

### Task 1: annotations for the key elements

Fill `src/content/annotations/pacs.008.001.14.yaml` `byPath` for the 30 distinct element paths in the sample (print them with `npm run check:content` output or the sample XML), so the coverage report reads 30 of 30. For each path write `explanation` (2 to 3 short plain-English sentences for a new bank analyst: what it is, why it exists, how it is used in a payment between two banks; define jargon on first use), optional `notes` (a pitfall or common confusion, only when sure), and `examples` using the sample's values where it helps. Branch elements (GrpHdr, CdtTrfTxInf, PmtId, SttlmInf, DbtrAgt, CdtrAgt, FinInstnId, Dbtr, Cdtr, DbtrAcct, CdtrAcct, Id) get an explanation of the block's role. Tone: sentence case, active voice, no marketing. Record in `docs/sources.md` that the explanations paraphrase the ISO definitions already cited and general public ISO 20022 knowledge, drafted by an AI and unreviewed. Check that the page `/messages/pacs.008.001.14/` shows the explanation above the official definition for a few elements (build, Playwright screenshot or the check:ui script).

Done when: `npm run check:content` prints "Coverage: 30 of 30", all checks pass, and the page shows the explanations.
