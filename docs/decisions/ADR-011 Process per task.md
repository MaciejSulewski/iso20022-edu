---
status: accepted
date: 2026-11-21
---
# ADR-011 Process per task

**Decision:** Complex tasks get the full flow: brainstorm, a short spec in `docs/superpowers/specs/`, a plan, then build. Complex means new UI islands, shared state or a new data format (T-031, T-042, T-051, T-052, T-070). Simple tasks get a short plan (in `docs/superpowers/plans/`), then build; no brainstorm or spec. (Amended 2026-11-24: simple tasks have had plans since Phase 5, see [[ADR-020 Delegated merging and session loop]].) Every `#agent` ledger line carries a "done when" criterion, so no spec is needed to know when it is finished.

**Why:** A spec for a config task costs more than the task. Without any process, the large interactive pieces drift from the design.

**Alternatives:** full flow for every task (slow), a short plan only for every task (too thin for the islands).

**Consequences:** Implementer subagents write code with `ponytail` in `full` mode; the orchestrating session does not need it ([[ADR-020 Delegated merging and session loop]]). UI work also uses `frontend-design`. The steps are in the `next-phase` skill. See [[Project Plan]], [[ADR-010 UX direction]].
