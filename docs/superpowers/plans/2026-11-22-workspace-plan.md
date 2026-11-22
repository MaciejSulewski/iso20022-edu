# Workspace (T-051) Implementation Plan

Spec: `docs/superpowers/specs/2026-11-22-workspace-design.md`; decision [[ADR-014 One workspace island]]. The spec is the authority; this plan argues from it.

## Global constraints

- ponytail full: smallest complete change, no new dependency.
- Every new or changed check (unit test or Playwright assertion) must be shown failing once against a deliberately broken implementation, then restored; list the breaks in the report. No swallowed timeouts, no checks that cannot fail.
- Never hand-edit `src/data/schema/*.json`. Own wording in new text; all UI text through `t()`.
- `git add` specific files only (the CRLF-modified docs files are not ours). Commit trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before finishing run: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui`.

## Task 1: Controlled panes and a three-column workspace at 1280px and up

Refactor `AnnotatedXml.tsx` and `SchemaTree.tsx` to controlled components: props `selected: string | null` and `onSelect(path)`; they stop owning the hash, the details panel and the sheet. Create `src/components/Workspace.tsx` owning `selected`, the hash (read on load and on hashchange, `replaceState` on select), the single `ElementPanel`, and the panel-data resolution from the spec (XML node info when the path is in the sample, else the tree record reported by the tree). Put pure parts (hash parsing, path to info lookup) in a testable lib file with unit tests. Switch `src/pages/messages/[id].astro` to render `Workspace` (pass what both components need: XML nodes, tree root children, overlay maps, labels). Delete the `/tree/<id>/` page (`src/pages/tree/[id]/index.astro`) but keep the JSON endpoints; fix links and the `check:a11y` and `check:size` page lists. In this task, stacking the panes vertically below 1280px is acceptable (Task 2 adds tabs). Update `scripts/check-annotated-xml.ts` and `scripts/check-schema-tree.ts` so they test the same behaviours against the workspace page (selection, deep link, keyboard, lazy loading, races, filters). Behaviours that no longer exist (the sheet) are removed in Task 2, not silently dropped here: mark them skipped with a visible reason in the report. Add checks that selecting in the XML pane marks the tree and the panel, and the reverse.

## Task 2: Resizable panes and narrow-screen tabs

Add the two separators with the keyboard, ARIA and limits from the spec (pointer drag too), the `XML | Tree | Details` tabs below 1280px using `src/components/ui/Tabs.tsx`, auto-switch to Details on selection and on a hash at load, and remove the sheet from this page. Add checks: arrow keys change the separator's `aria-valuenow` and the pane width in pixels (assert the measured width, not only the attribute); limits hold; at 390px the tabs switch, selecting in XML opens Details, a hash opens Details, `aria-selected` is right. Rework the old mobile-sheet checks into these.

## Task 3: Cross-pane checks, axe and docs

Cross-pane checks in `scripts/check-workspace.ts` (run by `check:ui`): selection round trips XML to tree to panel and back, including a path not in the sample and a repeated sample element; a search pick updates the XML pane only when the path exists there; required-only on while the selection is optional (state the rule you implemented and test it); no console errors. axe for both layouts in `check:a11y`. Update `docs/plan/Project Plan.md` only if it describes the pages (read it; one line). Do not edit the ledger or session notes (the controller does).
