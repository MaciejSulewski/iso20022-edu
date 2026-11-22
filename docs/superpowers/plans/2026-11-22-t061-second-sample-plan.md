# T-061 Second sample: plan

Ledger task: T-061 (Phase 5). Medium task, no separate spec ([[ADR-011 Process per task]]); this plan is the spec. Branch is stacked on `feat/t-060-overlay-types` (PR #47) because the sample reuses its shared-type overlay; the PR targets `main` and says "merge #47 first".

**Goal.** A second synthetic pacs.008.001.14 sample, "intermediary agent with structured remittance", with plain-English text for every element in it, reachable from the message page through a sample switcher.

**Current state.** `src/pages/messages/[id].astro` picks the first sample of the message with `.find`. `check:xml` (xmllint) validates every `src/content/samples/*.xml` against the pacs.008.001.14 XSD. `check-content` requires every sample element path to resolve and prints coverage. The first sample is `pacs.008-basic` (`.xml` + `.yaml`). `scripts/check-annotated-xml.ts`, `check-workspace.ts`, `check-schema-tree.ts`, `check-palette.ts` and `check-a11y.ts` load `/messages/pacs.008.001.14/`; that URL must keep showing `pacs.008-basic`.

**Global constraints.**

- Synthetic data only: fictional BICs (use the `TEST` prefix style of the first sample), made-up names, test IBANs, a made-up creditor reference. No real client data. Base ISO 20022 only, no CBPR+ usage rules.
- Own wording beside the ISO definition; no wording copied from the ISO definitions. Do not state facts the ISO definition or well-known base ISO 20022 meaning does not support. byType text from T-060 already covers shared types; add `byPath` entries only where a path has no byType or needs specific wording.
- Never hand-edit `src/data/schema/*.json`.
- Every new check is shown failing once against a deliberate break, then restored. Browser checks wait with `settled()` from `scripts/ui-wait.ts` before reading text, focus or position after an action.
- UI: use the `frontend-design:frontend-design` skill for the switcher; follow the existing look (Tailwind tokens, `text-muted`, `border-line`). Text only via `t()` and `src/i18n/ui.en.json`. Keyboard operable, not colour-only, passes axe.
- Conventional Commits, small commits, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Stage specific files only.
- Before reporting run `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui`.

## Task 1: The sample and its text

Files: `src/content/samples/pacs.008-intermediary.xml` and `.yaml`, `src/content/annotations/pacs.008.001.14.yaml`, `src/lib/content-schemas.ts` (+ test), `src/content/samples/pacs.008-basic.yaml`.

1. Add `order: z.number().int()` to `SampleSchema` (required). `pacs.008-basic` gets `order: 1`, the new sample `order: 2`. Update `content-schemas.test.ts` (accepts a sample with order, rejects one without; show it failing once). The first sample by `order` is the message page's default.
2. Write the sample `pacs.008-intermediary.xml`, id `pacs.008-intermediary`, title and scenario in the yaml: one customer credit transfer where the debtor agent and creditor agent do not have a direct relationship, so an intermediary agent (`IntrmyAgt1`) sits between them; `InstgAgt` and `InstdAgt` on the transaction name the two banks that exchange this message; the remittance information is structured: `RmtInf/Strd` with a creditor reference (`CdtrRefInf` with `Tp/CdOrPrtry/Cd` and `Ref`, a made-up reference) and one referred document (`RfrdDocInf` with type and number), plus `RfrdDocAmt/DuePyblAmt` only if it keeps the sample valid and readable. Pick `SttlmMtd` that matches the story (read the code list in the schema JSON) and say in the scenario why. Keep it as small as the story allows (about 60 to 90 lines). Use a different amount, currency pair or dates than the first sample is not required, but use different message, instruction and end-to-end references, a different UETR, and a header comment saying all data is synthetic.
3. `npm run check:xml` must pass (xmllint against the XSD) and `npm run check:content` must resolve every path. Break the XML once (for example swap two required elements) and show `check:xml` failing, then restore.
4. Annotation coverage: every distinct element path in the new sample must be annotated, either by an existing/T-060 `byType` entry or a new `byPath` entry. `check-content` prints coverage per run; it counts distinct paths across all samples, so the line must read N of N. New `byPath` entries go next to related existing entries, one per path, 1 to 3 sentences, own wording, in the same tone as the existing ones. Include `examples` where a value helps.
5. Sources: add any new source you used to `docs/sources.md`; none is expected.

Done when: `check:xml`, `check:content` (coverage N of N), `npm test` and `npm run build` pass.

## Task 2: Sample switcher

Files: `src/pages/messages/[id].astro` (becomes `src/pages/messages/[id]/[...sample].astro`), `src/i18n/ui.en.json`, possibly a small `src/components/` Astro component, a browser check in `scripts/check-annotated-xml.ts` or a new `scripts/check-samples.ts` wired into `check:ui`.

1. Routing: the message page shows one sample. `/messages/<id>/` shows the sample with the lowest `order` (unchanged URL). Each other sample is at `/messages/<id>/<sampleId>/`. Use one rest-param page file, with `sample` undefined for the default; every URL listed in the old `getStaticPaths` still builds. Check that `base` handling, `Astro.props` and the `import.meta.glob` lookups still work, and that the old file is removed (no duplicate route).
2. Switcher: above the workspace, when the message has more than one sample, a nav (`<nav aria-label>`, a short list of links, one per sample, title plus the one-line scenario or a short label; the current one has `aria-current="page"` and is not colour-only). On one sample nothing is shown. Mobile width 390px must not overflow. Keep the page JS budget: the switcher is plain HTML, no new island.
3. The page `<title>`/h1/scenario text use the chosen sample's title and scenario.
4. Browser check: `/messages/pacs.008.001.14/` still opens `pacs.008-basic` (its `GrpHdr/MsgId` shows `MSG-2026-0001`); the switcher lists both samples with the right `aria-current`; following the link to the second sample shows its XML (its own `MsgId`) and selecting `CdtTrfTxInf/IntrmyAgt1` or the structured remittance element opens the panel with explanation text; axe on the second page at desktop and 390px passes (add it to `scripts/check-a11y.ts`). Use `settled()`. Show the key assertions failing once against a break (for example making the default pick the highest `order`), then restore.
5. `check:size` stays well below budget.

Done when: both sample pages build, the checks pass locally, and `/messages/pacs.008.001.14/` is unchanged for the first sample.
