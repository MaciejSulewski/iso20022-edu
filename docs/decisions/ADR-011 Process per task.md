---
status: accepted
date: 2026-11-21
---
# ADR-011 Process per task

**Decision:** Complex tasks get the full flow: brainstorm, a short spec in `docs/superpowers/specs/`, a plan, then build. Complex means new UI islands, shared state or a new data format (T-031, T-042, T-051, T-052, T-070). Simple tasks go straight to build. Every `#agent` ledger line carries a "done when" criterion, so no spec is needed to know when it is finished.

**Why:** A spec for a config task costs more than the task. Without any process, the large interactive pieces drift from the design.

**Alternatives:** full flow for every task (slow), a short plan only (too thin for the islands).

**Consequences:** Code is written with `ponytail` in `full` mode. UI work also uses `frontend-design`. See [[Project Plan]], [[ADR-010 UX direction]].
