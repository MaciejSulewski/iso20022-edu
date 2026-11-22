---
status: accepted
date: 2026-11-22
---
# ADR-016 Lessons as Markdown content

**Decision:** Lessons are Markdown files in `src/content/lessons/en/`, loaded by an Astro content collection with a strict zod front matter (title, summary, step, order, related elements, sources, review status). One lesson per "Start here" step. Pages are plain HTML (no island), styled by a small `.lesson` block in `global.css`, and indexed by Pagefind so they appear in the Ctrl+K palette ([[ADR-015 Palette on every page]]). `check-content` validates the front matter, that related element paths resolve and that each step has one lesson.

**Why:** Lessons are text, so they should be easy to read, diff and review as text, and a build check can keep them tied to the schema and to sources. No MDX or typography plugin: nothing in a lesson needs a component, and it adds no dependency.

**Cost:** Lesson text is AI-drafted from public sources and unreviewed until the owner's accuracy review (T-093); every lesson shows a draft notice and carries `lastReviewed.by` = "unreviewed". A second language later adds a folder next to `en/`.

See [[2026-11-22-lessons-design]].
