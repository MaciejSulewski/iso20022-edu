# SchemaTree (T-050) Implementation Plan

Goal: a page `/tree/<message id>/` showing the **full** schema tree of a message (every element, including those the sample does not use), with lazy expansion, a mandatory-only filter, search and `#path` deep links. Reuses `src/lib/resolver.ts` and `src/components/ElementPanel.tsx`.

No separate spec: T-050 is not marked complex ([[ADR-011 Process per task]]); the design is here.

## Design (rulings, marked **[call]**)

- **Data is static JSON, not JS.** At build time, an Astro endpoint writes one file per complex type: `/tree/<id>/types/<TypeName>.json`, holding that type's children as ready-to-render `TreeChild` records (tag, isoName, definition, typeName, min, max, mandatory, repeating, choiceMember, choice, `kind` complex|simple, codes for simple types). A second endpoint `/tree/<id>/index.json` holds a flat search index `[path, isoName][]`. The island `fetch`es these on demand. JSON files do not count toward `check:size`; the island's own JS does. **[call]**
- **Recursion.** A type reachable from itself must not loop: the index builder and the island both stop at a type already on the current ancestor chain, and show that node as a leaf with a "recursive: see above" label. (pacs.008.001.14 may have none; the guard and its test are required anyway, using a synthetic schema.)
- **Overlay.** The 30 annotated paths come from `byPath`; pass `overlay.byPath` and `byType` to the island as props (small), merged client side when a node is selected. Type files carry no overlay.
- **Mandatory-only filter.** Hides elements whose `elementState` presence is "optional" (and their subtrees). Choice alternatives stay visible (one is required); **[call]**, same rule as beginner mode in `xml-view.ts`.
- **Search.** Case-insensitive substring on tag, ISO name and path; results list under the search box; picking one expands the ancestors and selects it. Index fetched on first focus of the box.
- **Deep links.** `#GrpHdr/CdtTrfTxInf/Dbtr/Nm` expands every ancestor (fetching type files in order) and selects the node; selecting writes the hash with `replaceState`, like AnnotatedXml. Unknown path: nothing selected, no error.
- **Panel.** Reuse `ElementPanel` (adapt a `TreeChild` into an `XmlNode` with `children: []`) and the existing `Sheet` on mobile, side panel on desktop, same breakpoint (1024px) as AnnotatedXml. T-051 later unifies the selection state; do not build a shared store now. **[call]**
- **Constraints** (business rules in the schema JSON `constraints`): show them in a collapsible list on the tree page. Do not touch `ElementPanel` for it. **[call]**
- **Accessibility.** Tree uses `role="tree"` / `treeitem` / `group`, `aria-expanded`, roving tabindex, Up/Down/Left/Right/Home/End/Enter. Markers: symbol plus word (reuse the legend language from AnnotatedXml/`xml-view.ts`), never colour alone. Use `frontend-design:frontend-design` for the visual pass; stay inside the existing tokens and dark mode.
- All text through `t()` (`src/i18n/ui.en.json`).

## Global constraints

- ponytail full mode: smallest complete change. No new dependencies.
- Never hand-edit `src/data/schema/*.json`.
- The whole schema JSON must not reach the browser. `npm run check:size` must pass (100 KB gzipped JS per page).
- Every new check (test, `check:ui` assertion) must be **shown failing once** against a deliberately broken implementation, then restored. State what you broke in the report.
- Own wording in any new UI text. No ISO text copied into new strings.
- Do not stage the CRLF-modified docs files; `git add` specific files.

## Task 1: Tree data layer (pure) and endpoints

Files: `src/lib/schema-tree.ts` (+ `schema-tree.test.ts`, add to the `npm test` script), `src/pages/tree/[id]/types/[type].json.ts`, `src/pages/tree/[id]/index.json.ts`.

- `childRecords(schema, typeName): TreeChild[]` built on `childrenOf`; skips `any` elements or marks them as a leaf `{any:true}` (decide; the XSD `any` is the SupplementaryData envelope; show it as a non-expandable "any content" row). Per-child fields as in Design. Mandatory follows `resolvePath` semantics (local to parent, choice alternatives never mandatory); do not re-derive differently: build the record through `resolvePath` on `<parentPath>/<tag>`, or share one helper with it.
- `searchIndex(schema): [path, isoName][]` walks from the root type with the ancestor-chain cycle guard.
- `pathChain(schema, path)`: ancestor paths of a deep link, `undefined` when it does not resolve.
- Tests: children of a known type; mandatory vs optional vs choice member; the `any` row; cycle guard on a synthetic recursive schema (must terminate and mark the repeat); search index contains `GrpHdr/MsgId`; unresolvable path chain. Use the committed schema JSON where possible (it is committed, CI-safe).
- Endpoints use `getStaticPaths` over `getCollection("messages")` ids and the schema's complex type names. Check the built output contains `dist/tree/pacs.008.001.14/types/*.json` and `index.json`, and report the file count and the largest file size.

## Task 2: SchemaTree island and page

Files: `src/components/SchemaTree.tsx`, `src/pages/tree/[id].astro` (or the folder form chosen in Task 1: pages and endpoints must not collide), strings in `src/i18n/ui.en.json`, landing link only if it is a one-line change.

- Island props: `id`, `rootPath` data (root children from build time so first paint needs no fetch), `base` (`import.meta.env.BASE_URL`), overlay maps, labels. Fetch child files lazily on expand, cache per type, show a loading and an error state (retry on error).
- Features per Design: lazy expansion, mandatory-only toggle, search, deep links, panel/sheet, keyboard, constraints list, recursion leaf.
- Then run `npm run build`, `check:size`, `check:a11y` (add the new page to its list if it enumerates pages), and look at the page in a browser at desktop and 390 px width, light and dark; report what you looked at.

## Task 3: Browser checks and docs

Files: `scripts/check-schema-tree.ts` (Playwright, same pattern as `check-annotated-xml.ts`, using `serveDist`), `package.json` (`check:ui` runs both scripts; CI already runs `check:ui`), `docs/sources.md` only if a new source is used (none expected).

Checks: first load fetches no type file beyond what the open nodes need (count requests); expanding a node fetches exactly its type file; a node not in the sample (pick one that is absent from `pacs.008-basic.xml`, e.g. under `GrpHdr/InstgAgt`) can be found, expanded and selected; mandatory-only hides an optional element and keeps a mandatory one; search finds an element by ISO name and selecting the result expands to it; a `#path` deep link opens at the right node with the panel showing it; keyboard Down/Right/Enter works; mobile width shows the sheet. Each assertion shown failing once.
