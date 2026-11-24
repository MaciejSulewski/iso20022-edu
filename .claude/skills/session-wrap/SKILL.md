---
name: session-wrap
description: Close an iso20022-edu work session - ledger consistent with merged PRs, session note written, docs PR merged. Use at the end of every session, after /next-phase, or when the user says "wrap up", "end the session" or "update the session note".
---

# Session wrap

1. `git switch main && git pull --ff-only`, then `npm run check:ledger -- --prs`. Every merged task branch must be ticked, or named on its open line. Fix what it reports.
2. Branch `docs/session-YYYY-MM-DD` (add `-2` if one exists today).
3. Write or append `docs/sessions/YYYY-MM-DD.md`. Append under a new `## <short title>` heading when today's note exists. Use these sections:
   - **Done:** per task, the PR link, what shipped, and the review rounds (findings fixed by severity).
   - **Calls (no live approval round):** design calls made without asking, so the owner can overrule them.
   - **Important for the owner:** AI-drafted text added this session and its weakest claims (from the content reviewer). These feed the `#me` review tasks.
   - **Deferred minors:** per task, from the PR review comments. Drop items that were fixed.
   - **Process notes:** anything that went wrong in the workflow (a skipped step, a restart, a flaky check), so the rules can be fixed.
   - **Next:** the next `#agent` tasks in ledger order, and the `#me` tasks that block them.
   - **Blockers.**
4. Add new tasks found this session to the ledger with fresh T-ids (never reuse one) and a "done when". If the session changed a workflow rule, update `CLAUDE.md` or the skill, not only the note.
5. `npm run check:ledger`, commit `docs: session note YYYY-MM-DD`, push, open the PR (`gh pr create --body-file <file>`, body written with the Write tool), wait for CI with `gh pr checks <N> --watch --interval 30`, and merge it with a merge commit. A docs-only PR needs `check:ledger` and a green CI `build`, not a local `verify`.
6. Tell the user in a few lines: what merged, what is next, and which `#me` tasks wait on them. The next session starts with `/next-phase`; no pasted prompt is needed.
