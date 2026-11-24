---
name: next-phase
description: Run the next iso20022-edu ledger tasks end to end (plan, implement, review, gates, PR, merge, session note). Use when the user says "/next-phase", "continue the project", "next tasks" or names T-ids to build. Optional argument - T-ids or a phase to limit the run, plus any one-off constraints.
---

# Next phase

The loop every build session runs. The rules are in `CLAUDE.md`; this file is the order of steps. If the user's message adds constraints for this session, they win.

## 1. Orient (no edits yet)

1. Read `docs/Home.md`, `docs/plan/Ledger.md` and the newest `docs/sessions/*.md` (its Next, Deferred minors and Blockers).
2. Run `npm run check:ledger -- --prs`. If it fails, fix the ledger first (docs PR) before any task.
3. `git status --short`, `git switch main && git pull --ff-only`. If the working copy has changes you did not make, stop and ask; never discard them.
4. `gh pr list --state open` and `gh run list --branch main --limit 3`. A red main or an open PR of yours comes before new work.
5. Pick tasks: the argument's T-ids, otherwise the open `#agent` tasks in ledger order (Now, then Next by phase). Skip `#me` and `#blocked`, and any task whose dependency is open. Tell the user in one line which tasks you will run.

## 2. Per task

1. **Branch** `feat|fix|docs/t-NNN-slug` off an up-to-date main (the `t-NNN` part lets `check:ledger --prs` find it).
2. **Decide the process** ([[ADR-011 Process per task]]): complex (new island, shared state, new data format) → `superpowers:brainstorming`, a short spec in `docs/superpowers/specs/`, then a plan. Simple → plan only. No live approval round is needed for design calls; mark each one **[call]** in the spec and list them in the session note.
3. **Plan** with `superpowers:writing-plans` into `docs/superpowers/plans/YYYY-MM-DD-t-NNN-slug-plan.md` (Task N headings, global constraints block).
4. **Run** `superpowers:subagent-driven-development`. Its scripts live in the plugin cache; use the newest version: `ls -td ~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/subagent-driven-development/scripts | head -1`, then `task-brief` and `review-package` from there. Per plan task:
   - implementer: `subagent_type: implementer` (Sonnet; Opus for a hard island or a tricky race). Brief = task brief path + global constraints + the commit trailer from the session's attribution reminder.
   - reviewer: `subagent_type: task-reviewer` (Opus) with the brief, the report and the review package. If the task adds or changes teaching text, also `subagent_type: content-reviewer`.
   - Critical or Important findings: one fix round by the implementer on the same branch, then a scoped re-review (Sonnet or Haiku for a tiny diff). Still open after that: stop and ask the user.
   - Minor findings: record them for the session note; do not fix unless trivial.
   - Check the trailer and staged files in the subagent's commits (`git log -3 --format=%B`, `git show --stat`).
5. **Gates, yourself:** `npm run verify` on the branch head. Quote its table (each gate's exit code). Never rely only on a subagent's report. Run it in the background; never run two builds at once.
6. **PR:** push the branch, `gh pr create --body-file <file>` (body: what, why, links to spec and plan, the Claude Code footer). Post the review result with `gh pr comment <N> --body-file <file>`: each review round, findings fixed, minors deferred. Write bodies and long commit messages to a scratch file with the Write tool (`git commit -F <file>`), not inline, so no shell quoting breaks them.
7. **Ledger tick on the branch, before merging:** mark the line `[x]` (add the line first if the task had none), add `✅ YYYY-MM-DD` and `[PR #N](url)` plus a short outcome, move it to Done, commit `docs: tick T-NNN`, push. For a task that needs more PRs, name each merged PR on its still-open line instead. A docs-only commit after step 5 needs `npm run check:ledger` and a green CI `build`, not a second `verify`.
8. **CI:** `gh pr checks <N> --watch --interval 30` (in the background). Never `sleep`, never `gh event listen`.
9. **Merge** under the merge rule in `CLAUDE.md`: `gh pr merge <N> --merge` only when review is clean, CI `build` is green for the head commit and no `#me` task blocks it. Stacked PRs: base first. Then `git switch main && git pull --ff-only`.

## 3. Between tasks

Re-read the ledger line of the next task; its dependencies may have changed. Keep going until the picked tasks are done, a `#me` task blocks the rest, or the user stops you.

## 4. End

Run the `session-wrap` skill. A session is not finished until its note is merged.
