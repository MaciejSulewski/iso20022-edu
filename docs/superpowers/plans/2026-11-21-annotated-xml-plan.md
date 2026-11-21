# AnnotatedXml and ElementPanel plan (T-042)

Spec (binding): `docs/superpowers/specs/2026-11-21-annotated-xml-design.md`. Read it fully first. Ledger line: T-042 "clicking an element opens the panel, `#GrpHdr/MsgId` deep-links, and it works by keyboard".

## Global constraints

- Node >= 24.2, TypeScript strict, `node --test file.ts` (type stripping: `.ts` import extensions, no enums). Astro 7, Tailwind v4 (tokens in `src/styles/global.css`), Preact 11. ESLint cannot parse TS in `.astro` (keep `.astro` files thin).
- All visible text through `t()` and `src/i18n/ui.en.json` (typed `UiKey`); islands get labels as props from the `.astro` page, like `StartHere`.
- Schema JSON is never hand-edited and never shipped to the browser; resolve at build time (spec, Approach 1).
- Synthetic data only; own wording beside the official ISO definition.
- Ponytail `full`: smallest complete change; frontend-design for the look (one memorable element, everything else quiet).
- `npm test`, `npm run lint`, `npm run format:check`, `npm run build` (includes check:content), `npm run check:size`, `npm run check:a11y` must pass. CI has no eRepository.
- Conventional Commits, small commits, no push to main, never stage the unrelated docs/ files that show as modified (CRLF noise): `git add <specific files>`.

### Task 1: XmlNode tree, page and AnnotatedXml (read-only view with selection and deep link)

Build `src/lib/xml-tree.ts` (+ `src/lib/xml-tree.test.ts`, added to `npm test`) per the spec's Data section; make `scripts/check-content.ts` reuse the shared path logic only if that is a small change. Add `src/pages/messages/[id].astro` and `src/components/AnnotatedXml.tsx`: indented XML, each element a button, collapse toggles, selected-row state, `#path` deep link on load and `hashchange`, hash updated on selection, ancestors expanded and the element scrolled into view, ArrowUp/ArrowDown between visible elements. For this task the selection shows a minimal placeholder in the side area (path and ISO name) that Task 2 replaces with ElementPanel. Add the `ui.en.json` keys. Link the "XML" step on the landing page (`src/pages/index.astro`, set `href` for the `xml` step) to the new page.

Done when: the page builds, unit tests pass, `npm run check:size` and `check:a11y` are green with the new page, and `#GrpHdr/MsgId` selects that element (verify with a quick Playwright or built-page check and say how in the report).

### Task 2: ElementPanel, responsive sheet, keyboard, browser check

Build `src/components/ElementPanel.tsx` per the spec UI section (header with ISO name and path breadcrumb, explanation or "none yet" note, official ISO definition set apart and labelled, facts in words, choice note, codes, examples, notes), the desktop sticky aside and the mobile bottom `<dialog>` (Esc closes and returns focus to the element; desktop Esc clears selection), `aria-live` title. Replace Task 1's placeholder. Add `scripts/check-annotated-xml.ts` (Playwright, serves `dist` like `scripts/check-a11y.ts`; share the static-server helper if extracting it is small, else keep both) with `npm run check:ui` and a CI step after build and check:a11y: click opens the panel with the ISO definition of MsgId, `#GrpHdr/MsgId` loads selected, keyboard Tab/Enter/ArrowDown selects, Esc closes the sheet at 390px width. Verify visually in light and dark at desktop and mobile widths (Playwright screenshots to the scratchpad; describe what you saw in the report).

Done when: all of the spec's Verification section holds and CI steps are added.
