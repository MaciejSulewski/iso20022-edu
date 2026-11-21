---
status: accepted
date: 2026-11-21
---
# ADR-009 TypeScript, Tailwind and Preact islands

**Decision:** Strict TypeScript everywhere, Tailwind CSS v4 for styling, and interactive parts as Preact islands (TSX) inside Astro. This replaces the "vanilla TS, no UI framework" part of [[ADR-001 Astro]].

**Why:** With the scope cut to pacs.008, the effort goes into user experience. The XML viewer, tree, element panel, search and flow share state (selected element, view mode), which gets hard to maintain with vanilla scripts. Preact is about 4 KB and keeps the static-first approach, since only interactive parts hydrate. Strict TS lets the site and `check-content.ts` share one typed schema resolver. Tailwind gives consistent tokens and dark mode with little code.

**Alternatives:** React islands (bigger runtime, larger ecosystem we do not need), vanilla TS (does not scale to the planned UX).

**Consequences:** `astro check` runs in the build. A JS budget of about 100 KB per page is tracked in Phase 9.

See [[Project Plan]], [[ADR-010 UX direction]].
