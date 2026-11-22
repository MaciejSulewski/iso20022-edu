# check:ui CI flake fix (T-051, PR #43) Plan

Context: PR #43 (`feat/t-051-workspace`) fails CI `check:ui` at 390px width while it passes locally. Three CI runs failed on three different mobile checks. The last: "mobile: a search pick opens the Details tab and puts focus on it" (run 45030723782), which the CI log shows with no measured values. Local Windows and a WSL Ubuntu clone (Node 24, headless Chromium, also with CPU contention) do not reproduce it.

## Global constraints

- No widened tolerances, no swallowed timeouts: a wait is bounded and throws on timeout.
- Every changed check must be shown failing once without its fix (a deliberately broken or slowed app or network), then restored. List each break in the report.
- Never hand-edit `src/data/schema/*.json`. `git add` specific files only (CRLF-modified docs files are not ours). Commit trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before finishing run: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui`.

## Task 1: Settled-state waits for every mobile check, and any app-side race

Leading hypothesis for the failing check (verify it, do not assume): after a search pick the Details tab is selected at once, but the panel text ("Agent that instructs the next") comes from the type record that `SchemaTree` fetches and passes up with `onRecord` (Workspace `record` state), so on a slower runner `aside.innerText()` is read before that text exists. The same shape can hit focus (`rowEl(path)?.focus()` in the search-pick handler in `SchemaTree.tsx` runs before the render that hides the tree pane) and scroll position.

1. Reproduce first. Slow the type-file requests (route delay of a few hundred ms) and/or throttle the CPU (CDP `Emulation.setCPUThrottlingRate`) in a scratch copy of the check, and show which mobile checks fail. A WSL Ubuntu clone is at `~/repo` (Node in `~/node/bin`; run through `wsl -d Ubuntu-26.04 -- bash <script>` from PowerShell, scripts in the scratchpad `run-ui.sh` and `run-ui-loaded.sh`; `git pull` it to your branch first).
2. Add one shared helper (a small module imported by the three check scripts, for example `scripts/ui-wait.ts`) that waits for a condition to hold on two consecutive animation frames, bounded (about 5 s), throwing a clear error that names the condition and prints the last measured values. Use it for every read that follows an action in the mobile checks of `scripts/check-annotated-xml.ts`, `scripts/check-schema-tree.ts` and `scripts/check-workspace.ts`: text in the panel, focus, scroll offset and position, selected tab, visibility. Audit EVERY mobile (390px) check, and list in the report which ones you changed and why the others need nothing.
3. Check for an app-side cause and fix it at the root if found: the order of focus, tab switch, scroll and reveal after a pick in `Workspace.tsx`, `SchemaTree.tsx` (search-pick handler, `openPath`, the `requestAnimationFrame(reveal)`), `AnnotatedXml.tsx` and `src/lib/reveal.ts`. Do not restructure beyond that.
4. Failing checks print what they measured (one line, on FAIL).
5. Run the three scripts 10 times in a row on WSL with CPU contention (`run-ui-loaded.sh 10`) and 10 times with the slowed network: zero failures. Report the counts.
