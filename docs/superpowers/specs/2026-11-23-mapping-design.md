# T-080 MT 103 to pacs.008 mapping: design

Ledger task T-080 (the review, T-081, is the owner's). Complex per [[ADR-011 Process per task]] because it adds a data format; kept short because the page is a static table. Decided without a live approval round; every **[call]** is mine.

## Intent

Lesson 5 ([[2026-11-22-lessons-design]]) says the site has no MT 103 field facts. This task adds a table that pairs MT 103 fields with pacs.008 elements, using only what public sources I actually read support, and shows it as unreviewed until T-081.

## Content truth rules

- Two public sources were read in full (raw text, not a summary): the BNY "A deep dive on pacs.008" paper (February 2021) and Ripple's "MT103 mapping" page. Neither is an official Swift or ISO mapping. BNY is written for the CBPR+ rollout and for earlier pacs.008 versions (`pacs.008.001.0X`); Ripple's table maps to its own payment object. Both facts are stated on the page.
- A row is in the table only if a source read says it. Each row names its source(s). A pairing that only Ripple gives (field 70) says so.
- Field labels are the ones the sources use (`50a`, `32a`), field names only where a source names them. No format, length, status or usage claims about MT 103 fields. No CBPR+ rules, no MyStandards content.
- Charge codes (BEN, OUR, SHA to CRED, DEBT, SHAR) are checked against the schema's `ChargeBearerType1Code`.
- Elements the BNY paper calls new compared with the MT messages, or gives no MT field for, go in a second table ("Elements with no MT field named in the sources"). A path is in one table only.
- Fields the sources do not cover are not listed by name (that would be an MT 103 claim without a source); the page says the table is partial.
- Own wording; synthetic data not needed (no samples).

## Design

**Data:** `src/content/mappings/mt103-pacs.008.yaml`, strict zod `MappingSchema`: `id`, `message`, `title`, `summary`, `lesson`, `sources` (same shape as lessons), `lastReviewed`, `rows[]` (`field`, `fieldName?`, `paths[]`, `codeList?`, `codes?[{mt, iso}]`, `note?`, `sources[]` as indexes), `additions[]` (`paths[]`, `note`, `sources[]`).

**check-content rules:** `message` has a schema; every path in `rows` and `additions` resolves; `codes[].iso` is a code of `codeList` in the schema; source indexes exist and every source is used; `lesson` exists; id matches the file name; no path appears twice across both tables; no field label twice.

**Page** `/mappings/mt103-pacs.008/` (`src/pages/mappings/[id].astro`), static, no island (no new JS). Draft notice in the same style as the flow page, then a short "what this is" paragraph (sources, partial, not official). Table 1: MT 103 field | pacs.008 elements (links to `/messages/<id>/#<path>`) | note | source. Table 2: elements and note. On a phone the tables sit in a keyboard-focusable scroll region so the page itself never scrolls sideways **[call]**. Sources list at the bottom. Indexed by Pagefind. Linked from Start here step 5 and lesson 5 (tool link "Open the mapping table"); lesson 5 text is updated to match.

**Checks:** `check-content` rules and tests; `scripts/check-mapping.ts` in `check:ui` (row counts match the data, the draft notice shows, an element link opens the workspace on that element, no horizontal page scroll at 390); axe covers the page automatically; `check-lessons` expects the new tool link. Every check is shown failing once.

## Not doing

Per-field MT 103 format rules, the Swift MT-to-MX translation rules, structured address splitting, a search or filter on the table, other message types, Polish text.
