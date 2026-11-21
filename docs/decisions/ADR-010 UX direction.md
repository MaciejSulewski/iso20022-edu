---
status: accepted
date: 2026-11-21
---
# ADR-010 UX direction

**Decision:** Clean docs-style, content first, light and dark. Four headline features:
- Landing page with a "Start here" guided path and progress in `localStorage`.
- Ctrl+K command palette (elements, glossary, lessons) backed by a build-time index and Pagefind.
- Colour-coded XML (mandatory, optional, choice, repeating) with hover previews and beginner/full modes.
- Split-pane workspace (XML | tree | details) on desktop, tabs and bottom sheet on mobile; animated flow player.

**Why:** Pacs.008 only means depth over breadth. New bank staff need to see structure at a glance and jump around fast. A docs-style look keeps attention on content.

**Constraints:** WCAG AA contrast; colour is never the only signal; full keyboard use; `prefers-reduced-motion` respected; about 100 KB JS per page; the user reviews the look in Phases 1 and 3.

See [[Project Plan]], [[ADR-009 TypeScript and Tailwind]].
