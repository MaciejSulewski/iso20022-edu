# Command palette (T-052) Implementation Plan

Spec: `docs/superpowers/specs/2026-11-22-palette-design.md`; decision [[ADR-015 Palette on every page]]. The spec is the authority; this plan argues from it.

## Global constraints

- ponytail is off for this session; still: smallest complete change, one new dependency only (`pagefind`, dev).
- Every new or changed check (unit test or Playwright assertion) must be shown failing once against a deliberately broken implementation, then restored; list the breaks in the report. No swallowed timeouts, no checks that cannot fail. In browser checks use `settled()` from `scripts/ui-wait.ts` for every read that follows an action.
- All UI text through `t()` (`src/i18n/ui.en.json`, keys `palette.*`). Existing colour tokens only; light and dark. No ISO definition text. Never hand-edit `src/data/schema/*.json`.
- Nothing is fetched on page load: the element index and Pagefind load on first open (a check proves it). Page JS stays under `check:size`; report before and after.
- Use `frontend-design:frontend-design` for the look: quiet, the site's tokens, match shown by bold plus underline (never colour alone), 44px rows at 390px, no entrance animation.
- `git add` specific files only (CRLF-modified docs files are not ours). Commit trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before finishing run: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui`.
- Add every new unit test file to the `test` script in `package.json` and the new browser check to `check:ui`.

## Task 1: Pure palette logic and UI strings

Create `src/lib/palette.ts` with unit tests `src/lib/palette.test.ts`: `shouldOpen(e)` (Ctrl or Cmd plus K, false when the event target is an `input`, `textarea`, `select` or contenteditable element that is not inside the palette dialog; take a minimal `{ctrlKey, metaKey, key, target}` shape so it is testable without a DOM), `elementResults(indexes, query, limit = 8)` over `searchTree` from `src/lib/tree-view.ts` (each hit carries message id, path, ISO name and the name split into plain and matched parts for `<mark>`; total count), `pageResults` shape for Pagefind hits (title, url, excerpt, capped at 5), and `status(total, shown, ...)` wording keys for "N results", "No results", "Showing 8 of N". Add the `palette.*` strings to `src/i18n/ui.en.json` (open button, shortcut, dialog title, input label, hint, groups, counts, loading, index error, Retry). Tests cover: shortcut from body/button opens, from inputs, textarea, select, contenteditable does not, from the palette's own input does; Meta and Ctrl both; other keys no; match split for a name with spaces and case differences; limit and total; empty query gives nothing.

## Task 2: Palette island, Base integration, Pagefind in the build

Create `src/components/Palette.tsx` as the spec describes (native dialog, combobox/listbox, groups, live region, lazy index fetch and Pagefind `import()` on first open, error state with Retry, pick behaviour with the dialog closed first and `location.hash` on the message's own page, `location.href` elsewhere), rendered in `src/layouts/Base.astro`'s header with `client:idle`, passing the messages collection (id, title, URL, index URL, all built with `import.meta.env.BASE_URL`). Add `pagefind` as a dev dependency, change the `build` script to run `pagefind --site dist` after `astro build`, put `data-pagefind-body` on `<main>` and `data-pagefind-ignore` on the 404 and `/dev/` pages. Make sure `scripts/serve-dist.ts` serves `dist/pagefind/*` with the right content types (`.js`, `.json`, `.pf_*`, `.pf_meta`, wasm). Confirm `check:size` is unchanged apart from the island.

## Task 3: Browser checks, axe, docs

Create `scripts/check-palette.ts` (add it to `check:ui`) covering the spec's "Checks" list: nothing fetched before the first open; Ctrl+K and the header button open it, input focused, dialog and combobox attributes; "BICFI" lists the element; from the landing page Enter lands on `/messages/pacs.008.001.14/#<path>` with the element selected and the Details panel showing it; on the workspace page a pick updates selection without a reload; Esc closes and focus returns to the opener; Ctrl+K inside the tree search input does nothing; a failed index shows the error and Retry recovers (route interception); a Pagefind hit appears for a word on the landing page; arrows wrap; 390px fits without sideways scroll. Extend `scripts/check-a11y.ts` with the palette open (1280px and 390px, light and dark, with results listed). Update `docs/plan/Project Plan.md` only where it describes search (one line) and `docs/sources.md` only if a new source was used (Pagefind: record as a tool, not content, if the file has such a section). Do not edit the ledger or session notes (the controller does).
