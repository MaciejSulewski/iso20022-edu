---
status: accepted
date: 2026-11-24
---
# ADR-020 Delegated merging and session loop

**Decision:** Claude merges its own PRs (code and docs) with a merge commit once the task review has no open Critical or Important finding, CI `build` is green for the head commit and no `#me` task blocks it. The working rules live in `CLAUDE.md`, the project skills (`next-phase`, `session-wrap`, `add-message`) and the project agents (`implementer`, `task-reviewer`, `content-reviewer`) in `.claude/`, not in a prompt pasted at the start of each session. Mechanical rules are enforced by code: `npm run verify` (all gates), `npm run check:ledger` (ledger format; `--prs` catches a merged task left unticked) and the `.claude/hooks/guard.ts` hook (no push to `main`, force-push, branch deletion or discarding working-copy changes).

**Why:** From Phase 3 on, every session prompt delegated merging, so the "user merges" rule in `CLAUDE.md` was dead text and had to be re-granted by hand. The rest of the real workflow (gates, check-writing rules, CRLF handling, CI waiting) lived only in a 7 KB `next-session-prompt.md`, so a session without it had none of those rules, and steps were missed (the T-102 ledger tick, a `git checkout --` on the owner's files, concurrent builds).

**Alternatives:** keep merging with the owner (slower, and it was already delegated in practice); keep the pasted prompt (rules drift and are lost between sessions).

**Consequences:** the owner reviews content in `#me` tasks and can still stop any PR before CI is green. `docs/sessions/next-session-prompt.md` shrinks to a pointer to `/next-phase`. Implementer subagents use `ponytail` full; the orchestrator does not ([[ADR-011 Process per task]]). See [[Project Plan]], [[ADR-007 Hosting and review]].
