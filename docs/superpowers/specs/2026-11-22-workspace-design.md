# Split-pane workspace (T-051): design

Intent: a learner reads the sample XML, sees the same element in the full schema tree and reads its meaning, without losing their place. Desktop shows the three side by side; a phone shows one at a time.

Non-goals: new content, a command palette (T-052), flow diagrams, persisting pane widths between visits, drag-reordering panes. Anti-goal: three copies of the selection, hash and panel logic.

This design was written without a live approval round (the user delegated the session; same as T-042 and T-046). Calls are marked **[call]**.

## Approaches

1. **One island, controlled children (chosen).** `Workspace` holds `selected`; `AnnotatedXml` and `SchemaTree` become controlled. Simple data flow, no new dependency.
2. Three islands plus a tiny shared store module. Keeps the components independent, but each still needs hash and panel handling, and hydration order creates races.
3. `@preact/signals`. A new dependency for one value. Rejected ([[ADR-014 One workspace island]]).

## Behaviour

- **Page.** `/messages/<id>/` becomes the workspace. The standalone `/tree/<id>/` page is removed; the JSON data endpoints under `/tree/<id>/` stay. **[call]**
- **Selection.** One `path` (no repeat indexes, no `Document/root` prefix). Selecting in any pane or in the panel breadcrumb updates the others: the XML pane scrolls to and marks the first row with that path (keeping its current row if it already has that path); the tree pane expands to the path and marks it; the panel shows it. `#path` is read on load and on `hashchange`, written with `replaceState` on select. Unknown hash: nothing selected.
- **Panel data.** A path present in the sample uses the XML node's info (it carries the overlay explanation). Any other path uses the tree record, loaded by the tree's `openPath`; the tree reports it to the workspace. **[call]**
- **Desktop (width at least 1280px).** Three columns XML | tree | details with two separators. A separator is `role="separator"`, `aria-orientation="vertical"`, focusable, with `aria-valuenow/min/max` in percent of the workspace width and an `aria-label` naming the two panes it divides. Left and Right move 2 %, Shift+arrow 10 %, Home and End go to the limits; pointer drag works too. Each pane has a minimum width of 20 %. **[call]**
- **Narrower than 1280px.** Tabs `XML | Tree | Details` (existing `Tabs` primitive, roving focus). Selecting an element in XML or tree switches to Details (the old bottom sheet is dropped on this page, since Details is a tab); a hash on load opens Details. The tab bar stays visible. **[call]** The breakpoint is 1280 instead of the 1024 used before, because three panes at 1024 are too narrow. **[call]**
- **Keeps working.** Legend, beginner/full mode, hover previews (XML pane), required-only filter and search (tree pane), the keyboard models of both panes, the `constraints` list (under the tree pane), the recursion guard and lazy type fetching.
- **Accessibility.** Each pane is a labelled region. Axe clean in light and dark at both layouts.
- **Budget.** `npm run check:size` stays under 100 KB gzip for the page.

## Left to the builder

The exact refactor shape of the two components, the CSS grid vs flex mechanics for the panes, and how the panel reaches the tree record.
