# CLAUDE.md

Rules for Claude Code in this repository. Project description, design and status live in `docs/` (an Obsidian vault), not here.

## Where to find things

- `docs/Home.md`: vault entry point. `docs/plan/Project Plan.md`: architecture, code map, data model, phases, risks.
- `docs/plan/Ledger.md`: tasks and status. `docs/decisions/ADR-NNN *.md`: one note per decision.
- `docs/sessions/YYYY-MM-DD.md`: session logs. `docs/sources.md`: public sources. `docs/maintenance.md`: yearly update routine.
- `.claude/skills/`: `next-phase` (the build loop), `session-wrap` (end of session), `add-message` (Stage 2 recipe).
- `.claude/agents/`: `implementer`, `task-reviewer`, `content-reviewer`. `CONTRIBUTING.md`: the same rules for humans.

## Session

- Start of every session: invoke `superpowers:using-superpowers` and follow it. A build session is `/next-phase` (optionally with T-ids); it reads Home, the Ledger and the newest session note itself. No pasted prompt is needed.
- End: `/session-wrap` (ledger consistent with merged PRs, session note, docs PR merged). A session is not done until its note is merged.
- Ledger line format: `- [ ] T-NNN description #me|#agent #phase/N`. IDs are never reused. Done = `[x]` + `✅ YYYY-MM-DD` + link to the PR or session note, ticked on the task's branch before merging. Blocked = `#blocked` + reason. `npm run check:ledger` enforces the format.
- `#me` tasks (accounts, downloads iso20022.org blocks for bots, subject-matter review) are the user's, not yours. Every task that adds teaching text gets a matching `#me` review task.
- New decisions go in a new `docs/decisions/ADR-NNN *.md`. Use Obsidian `[[wikilinks]]` between notes. A workflow change goes into this file or a skill, not only into a session note.

## Per task ([[ADR-011 Process per task]])

- Complex tasks (new island, shared state, new data format) get brainstorm, a short spec in `docs/superpowers/specs/`, a plan, then build. Simple tasks get a plan, then build. Design calls made without the user are marked **[call]** and listed in the session note.
- Build with `superpowers:subagent-driven-development`: per plan task an `implementer` subagent, then a `task-reviewer` (plus `content-reviewer` for teaching text). One fix round for Critical/Important findings, then a scoped re-review. Still open after that: ask the user. Minors go to the session note.
- Review results are posted as a PR comment.

## Merge rule ([[ADR-020 Delegated merging and session loop]])

- Claude merges its own PRs (code and docs) with a merge commit when: the review has no open Critical/Important finding, CI `build` is green for the PR's head commit, and no `#me` task blocks it. Stacked PRs merge base first.
- Wait on CI with `gh pr checks <n> --watch --interval 30` in the background. Never `sleep` to wait, never `gh event listen`.
- Never without the user's OK: push to `main`, force-push, delete branches, change repo settings, commit the eRepository files, discard working-copy changes you did not make (ask first, even for line-ending-only ones). `.claude/hooks/guard.ts` blocks these.

## Gates

- `npm run verify` runs every gate (test, lint, format:check, check:ledger, check:xml when xmllint exists, build, check:size, check:a11y, check:ui) one after another and prints each exit code. It must pass on the branch head before a PR and before a merge. A docs-only commit on top (ledger tick, session note) needs `npm run check:ledger` and a green CI `build`, not a second `verify`.
- Run it yourself and quote the exit codes; do not trust only a subagent's report. Never run two builds at once (they share `dist/`).

## Writing checks

- Every new check is shown failing once against a deliberate break, then restored.
- Browser checks wait with `settled()` from `scripts/ui-wait.ts` before reading position, focus, scroll or text after an action. Expected values come from the source data (YAML, schema JSON), never from the page under test. Timeouts fail loudly.
- `UI_DELAY_MS` and `UI_CPU_RATE` slow the browser checks on purpose; a WSL Ubuntu clone at `~/repo` reproduces Linux CI.

## Git and Windows

- Branches `feat/…`, `fix/…`, `docs/…`; task branches are `<type>/t-NNN-slug`. Conventional Commits (`feat:`, `fix:`, `docs:`, `content:`, `chore:`), small commits, with the attribution trailer from the session's reminder.
- One branch and PR per task off an up-to-date `main`. Stage specific files only, never `git add -A`.
- Line endings are LF (`.gitattributes`). After an edit, check `git diff`; some tools silently skip edits to CRLF files.
- Use the Write tool for scripts longer than a few lines, not a long heredoc, and for PR bodies, review comments and long commit messages (`gh pr create --body-file`, `gh pr comment --body-file`, `git commit -F`). Run long commands in the background.
- The guard hook needs `node` on the hook shell's PATH. A "node: command not found" hook error means the guard is off: tell the user.

## Skills

- Writing code: implementer subagents invoke `ponytail:ponytail` in `full` mode (never `ultra`). The orchestrating session does not need it.
- UI / UX tasks: `frontend-design:frontend-design`.

## Content rules

- Base ISO 20022 definitions only (CBPR+ is not public).
- Public sources only, each recorded in `docs/sources.md`.
- Own wording, with the official ISO definition shown beside it.
- Synthetic data only (fictional BICs, test IBANs). No secrets or real client data.
- Never hand-edit generated files (`src/data/schema/*.json`); change `scripts/import-xsd.ts` instead.
- Licences: code MIT, own content CC BY 4.0, with the disclaimer "educational, not affiliated with ISO/Swift".
