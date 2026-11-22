# Command palette (T-052): design

Ledger: T-052. Decision: [[ADR-015 Palette on every page]]. Builds on [[ADR-014 One workspace island]]. Written without a live approval round, as for T-042, T-046 and T-051; every choice of mine is marked **[call]**.

## Intent

A new bank colleague who half-remembers a field name ("debtor agent", `BICFI`) should reach it from any page in two keystrokes. Ctrl+K (Cmd+K on macOS) opens a search box; picking an element opens the workspace with that element selected. Lessons and the glossary will show up in the same box once they exist.

## Goals

- Ctrl/Cmd+K, or a visible header button, opens the palette on every page. Picking an element goes to `/messages/<id>/#<path>`; on that page itself it selects the element in the Workspace.
- Elements come from the existing build-time index (`/tree/<id>/index.json`, `searchIndex` in `src/lib/schema-tree.ts`). Matching reuses `searchTree` from `src/lib/tree-view.ts`.
- Pagefind indexes the built pages for lessons and glossary. Today it indexes only what exists; nothing is wired for pages that do not exist yet.
- Keyboard and screen readers: dialog semantics, focus returns to the opener, Esc closes, arrows and Enter pick.

## Non-goals

- No glossary or lesson content (T-090, T-092). No fuzzy ranking beyond `searchTree`. No recent searches. No command verbs ("toggle dark mode"). No second message type.

## Anti-goals

- No page-load cost: the element index and Pagefind load only when the palette first opens. Nothing is fetched on load.
- No Ctrl+K hijack where it would surprise (below). No silent failure when the index or Pagefind cannot load.

## Constraints

- Page JS stays under the `check:size` budget (100 KB gzip; the workspace page is 18.4 KB now). **[call]** the palette's own code should add at most about 4 KB gzip; the check:size output is the proof. Pagefind's JS and index are loaded by `import()` from a URL at run time, so they are not in any page's static graph.
- All UI text through `t()` (`src/i18n/ui.en.json`). No new colours: existing tokens only. Works in light and dark.
- Own wording; no ISO definition text is shown (names and paths only).

## Approaches

1. **One palette island in `Base.astro`, element index fetched on first open, Pagefind loaded on first open (chosen).** Works on every page, costs nothing until used, reuses the tree JSON.
2. A palette only inside the Workspace. Rejected: the landing and later lesson pages could not use it, and the ledger says Ctrl+K "jumps to an element, term and lesson" from the site.
3. Bake the whole index into the page. Rejected: 11 KB gzip on every page, against the lazy-static-JSON constraint.

## Design

**Placement.** `src/components/Palette.tsx` (Preact, `client:idle`), rendered in the `Base.astro` header next to the theme toggle. It gets the list of messages (`id`, title, page URL, index URL) from the `messages` collection as props. **[call]** `client:idle`, not `client:load`, so the keyboard shortcut is live shortly after load without competing with first paint; the check waits for it.

**Trigger.** A button in the header: the text "Search", with the shortcut shown as text ("Ctrl K", or "⌘K" when `navigator.platform` looks like Apple) hidden below 640px; `aria-keyshortcuts="Control+K Meta+K"`. A `keydown` listener on `window` opens on Ctrl+K or Cmd+K and calls `preventDefault`, except when the event target is an `input`, `textarea`, `select` or `contenteditable` element outside the palette, where it does nothing (the browser keeps its default). **[call]** This also means Ctrl+K does not fire from the tree's search box; the header button works there.

**Dialog.** A native `<dialog>` opened with `showModal()` (as `Sheet.tsx`): the browser traps focus, closes on Esc and returns focus to the opener. Clicking the backdrop closes it. It is `aria-labelledby` a visually hidden title ("Search the site"). Closing clears the query.

**Combobox.** One text input (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`), focused when the dialog opens, and a `role="listbox"` of `role="option"` rows. ArrowDown/ArrowUp move the active row (wrapping), Home/End stay in the input, Enter picks the active row, a click picks. The first result is active as soon as there are results. A polite live region says the count ("12 results", "No results", "Loading the index").

**Results.** Two groups with headings (listbox `role="group"`): **Elements** (up to 8; each row shows the ISO name, with the matched part marked in `<mark>`, the path in mono beneath, and the message name once there is more than one message) and **Pages** (up to 5 from Pagefind: title and a one-line excerpt). **[call]** An empty query shows no results and a one-line hint ("Type an element name or path, for example BICFI or debtor agent"). Too many matches show "Showing 8 of N" as the status, not a "more" row.

**Picking.** An element: if the page is that message's page, set `location.hash = "#" + path` (the Workspace listens for `hashchange`, ADR-014) and close; else `location.href` to the message URL plus the hash. A page result: `location.href`. Closing returns focus to the opener, then the Workspace's own focus rules apply. **[call]** On the workspace page the dialog closes first, then the hash is set, so the Details tab focus is not stolen back by the dialog's focus return.

**Loading and errors.** First open: fetch every message's `index.json` (one today) and `import()` Pagefind (`<base>pagefind/pagefind.js`) in parallel. Index fetch fails: the status says "The element index could not be loaded. Try again." with a Retry button. Pagefind missing (dev server, or no pagefind output): the Pages group is simply absent and the status does not mention it **[call]**, because Pagefind is absent only in `astro dev`; the build always produces it (a check proves it).

**Build.** `npm run build` becomes `... && astro build && pagefind --site dist` (dev dependency `pagefind`). `<main data-pagefind-body>` in `Base.astro` limits the index to page content. The 404 page and `/dev/` pages carry `data-pagefind-ignore`. **[call]** The workspace page is indexed as it is (its static HTML), accepted as noise until lessons exist.

**Visual direction.** Quiet and exact, in the site's own tokens (system sans, mono for paths, the blue accent): a panel anchored near the top of the viewport (about 12vh down), `max-w-xl`, left-aligned, squared to the site's existing radius, `bg-bg` with a `border-line` outline and the backdrop dimmed. The one memorable detail is the result row: ISO name in regular weight with the match in bold plus underline (never colour alone), path in mono under it, and the active row marked by a left accent bar plus a surface background. No entrance animation (**[call]**); nothing moves for `prefers-reduced-motion` users. At 390px the panel is full width, the list scrolls inside a max height, and rows are at least 44px tall.

## Checks

- Unit (`npm test`): the pure parts in `src/lib/palette.ts`: shortcut-target rule (`shouldOpen(event target)`), grouping and limiting of element and page hits with `searchTree`, the "Showing 8 of N" status, match marking (split a name into plain and matched parts).
- Browser (`scripts/check-palette.ts`, in `check:ui`): Ctrl+K opens, input focused, `role=dialog` and combobox attributes; no request to an index or Pagefind file before the first open (request log); typing "BICFI" lists the element, ArrowDown/Enter on another page's flow lands on `/messages/pacs.008.001.14/#<path>` with the element selected; on the workspace page the selection and Details panel update with no reload; Esc closes and focus returns to the opener; Ctrl+K inside the tree search input does not open it; the header button opens it; a failed index shows the error and Retry recovers; the Pages group lists a Pagefind hit for a word on the landing page; 390px: palette fits, no sideways scroll. Each check shown failing once.
- `check:a11y`: axe with the palette open at 1280px and 390px, light and dark.
- `check:size` still under budget; the report states the page JS before and after.

## Left to the builder

File layout inside the components above, the exact hint wording, Tailwind classes, how `check-palette.ts` finds the Pagefind hit word.
