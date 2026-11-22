---
status: accepted
date: 2026-11-22
---
# ADR-015 Palette on every page

**Decision:** The Ctrl+K palette is one Preact island in `Base.astro`, so every page has it. Elements come from the build-time `/tree/<id>/index.json`; lessons and the glossary come from Pagefind, run after `astro build` (`pagefind --site dist`). Both load only when the palette first opens.

**Why:** The palette is site-wide navigation, not a feature of the workspace. Lazy loading keeps the index (11 KB gzip) and Pagefind out of every page's JS budget. Picking an element sets the `#path` hash, which the workspace already listens for ([[ADR-014 One workspace island]]), so no new selection path exists.

**Cost:** One more island on every page (a few KB). Pagefind exists only after a build, so `astro dev` shows no page results. Ctrl+K is left alone inside text fields, so it does not open from the tree's search box.

See [[2026-11-22-palette-design]].
