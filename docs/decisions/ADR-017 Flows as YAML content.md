# ADR-017 Flows as YAML content

Status: accepted 2026-11-22.

**Decision.** A payment flow (participants, steps, messages, element paths, settlement codes) is a YAML file in `src/content/flows/`, validated by a strict zod schema and by `check-content` against the message schema. One Preact island (`FlowPlayer`) renders any flow on `/flows/<id>/`.

**Why.** Same rule as samples and lessons: content is checked data. A wrong element path or a settlement code the schema does not list fails the build instead of reaching readers. Steps can be edited without touching TypeScript.

**Consequences.** The cover method is shown as an outline with a notice, because lesson 4's public sources are weak ([[2026-11-22-flow-design]]). Animation is CSS only and off under `prefers-reduced-motion`. Related: [[ADR-016 Lessons as Markdown content]], [[ADR-014 One workspace island]].
