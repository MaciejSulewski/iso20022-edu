# AnnotatedXml and ElementPanel (T-042): design

Status: written without a live approval round (the user asked for an unattended Phase 3 run). Design calls are marked **[call]**. The user reviews the look in T-045.

## Intent

A new bank analyst opens the pacs.008 sample, sees the real XML, clicks any element and learns what it is: the ISO name and official definition, the type, whether it is mandatory, repeating or a choice alternative, allowed codes, and (later) a plain-English explanation. A link such as `#GrpHdr/MsgId` opens that element directly.

## Goals

- `/messages/pacs.008.001.14/` shows the sample as readable, indented XML. Every element is a button.
- Clicking (or Enter/Space on) an element opens ElementPanel: side panel on desktop, bottom sheet on mobile.
- `#GrpHdr/MsgId` deep-links: on load and on `hashchange` the element is selected, its ancestors expanded, and it is scrolled into view. Selecting an element updates the hash.
- Works by keyboard alone: Tab reaches each element and each collapse toggle; ArrowUp/ArrowDown move between visible elements; Esc closes the sheet (mobile) or clears the selection (desktop).
- Elements without an overlay still show the official ISO definition; the panel says plainly that no plain-English explanation exists yet.
- Stays under the JS budget (`npm run check:size`) and the axe check.

## Non-goals (later tasks)

T-044 overlay content; T-046 legend, hover previews, beginner/full mode, colour coding; T-050 full tree (elements the sample does not use); T-052 palette. No colour-only states: the panel uses text labels from day one.

## Approaches

1. **Resolve at build time, ship a small node tree to the island (chosen).** The Astro page parses the sample, resolves every element with `src/lib/resolver.ts` and the overlay, and passes a JSON tree (about 30 nodes) as island props. The 4500-line schema JSON never reaches the browser.
2. Ship the schema JSON and resolve in the browser: simpler data flow, but hundreds of KB of JS-side data against a 100 KB budget.
3. Static HTML with a vanilla script: smaller, but the plan (ADR-009) puts the XML view, panel and later tree on shared Preact state.

**[call]** Approach 1: the budget decides it. The resolver stays pure so T-050 can reuse it at build time.

## Data

`src/lib/xml-tree.ts` (pure, no Astro): `buildTree(xml: string, schema, overlay?) => XmlNode[]` (and a reusable `elementPaths` for `check-content`, which should import it instead of keeping its own copy if the change is small).

```ts
type XmlNode = {
  path: string; // "GrpHdr/MsgId", no indexes, no Document/root prefix
  tag: string;
  value?: string; // text content of leaf elements
  attrs?: Record<string, string>; // e.g. Ccy
  repeatIndex?: number; // 1-based, only for repeated siblings, display only
  children: XmlNode[];
  info: {
    isoName: string; definition: string; typeName: string;
    min: number; max: number | "unbounded";
    mandatory: boolean; repeating: boolean; choiceMember: boolean; choice: boolean;
    codes?: { code: string; name?: string; definition?: string }[]; // both schema code shapes normalised
    explanation?: string; notes?: string; examples?: string[]; // from overlay (byPath, else byType), localized text resolved to en
  };
};
```

Repeated siblings share one `path`; a deep link selects the first. Unresolved elements fail the build (check-content already catches them; `buildTree` throws with the path).

## UI

- **Page** `src/pages/messages/[id].astro`: `getStaticPaths` over the `messages` collection; loads the message's sample (via the `samples` collection `file`) and annotations. Uses `Base`; all text through `t()` (new keys in `ui.en.json`). Island: `client:load` (the XML is the page's main content).
- **AnnotatedXml.tsx**: renders nodes as indented lines of `<tag attr="…">value</tag>`. Mono font, existing tokens. Element line = one `<button>` holding the opening tag and, for leaves, the value and closing tag. Branches get a separate collapse toggle (`aria-expanded`) and show `…` and the child count when collapsed. The selected line has an accent bar and `aria-current="true"`. **[call]** Everything starts expanded.
- **ElementPanel.tsx**: header = ISO name (large) plus a breadcrumb of the path (each ancestor a link that selects it). Body, in this order: plain-English explanation (or the "none yet" note), the official ISO definition (labelled as such, set apart, own wording stays visually distinct from it), facts (type, multiplicity as words: "required, once", "optional, up to N", "required, repeating"), "one of" note for choice alternatives, allowed codes (code, name, definition), examples, notes. Facts use text labels. Constraint rules (the JSON's `constraints`) are not tied to elements yet: **[call]** not shown in T-042.
- **Layout:** `lg` and up: two columns, XML left, panel as a sticky `<aside aria-label>` right (empty state: "Select an element"). Below `lg`: the panel is a native bottom `<dialog>` (modal, Esc, focus return from the browser, same approach as `Sheet.tsx`, which is right-side and not controllable, so ElementPanel gets its own small dialog wrapper). **[call]** `matchMedia("(min-width: 1024px)")` decides which; before hydration the XML is server-rendered and readable.
- **State:** `@preact/signals` is not installed; **[call]** plain `useState` plus a `useEffect` hash listener is enough for one island. Revisit at T-051.
- **Look (frontend-design):** existing tokens (one blue accent, docs-style, ADR-010). The memorable thing is the selected element's treatment: accent bar, tinted row and the breadcrumb in the panel that mirrors the XML path. Tags in accent colour, values in foreground, attributes muted; thin indent guides per depth. Everything else is quiet. Motion: none beyond the browser's native dialog behaviour; respects `prefers-reduced-motion` trivially.
- **Accessibility:** buttons with visible focus (global `:focus-visible`), `aria-expanded`, panel region labelled, selection announced via `aria-live="polite"` on the panel title, contrast AA in both themes, targets at least 24px high on mobile.

## Verification

- Unit tests for `buildTree` (paths, repeated siblings, attributes, codes normalisation, overlay byPath over byType, unresolved throws).
- `scripts/check-annotated-xml.ts` (Playwright, run in CI after build, like `check-a11y.ts`): click `MsgId` opens the panel with its ISO definition; load with `#GrpHdr/MsgId` selects it; Tab/Enter/ArrowDown works; Esc closes the sheet at mobile width.
- `npm run build`, `check:size`, `check:a11y` (the new page is picked up automatically) stay green.

## Left to the builder

Class names and exact spacing, how the page header reads, the exact wording of the new `ui.en.json` strings (sentence case, plain verbs), and whether the dialog wrapper is a shared primitive or local to the panel.
