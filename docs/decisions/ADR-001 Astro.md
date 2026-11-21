---
status: accepted
date: 2026-11-21
---
# ADR-001 Astro static site

**Decision:** Astro (static output) with vanilla TS scripts, no UI framework. Deployed to GitHub Pages via withastro/action.

**Why:** Zod-validated content collections catch broken content when the standard changes; built-in i18n for a later Polish locale. Alternatives considered: Eleventy (simpler, needs a separate validation script) and plain HTML/JS (no tooling, but hand-rolled routing and i18n).

See [[Project Plan]].
