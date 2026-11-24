import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { check, segments } from "./guard.ts";

const onFeature = () => "feat/x";
const onMain = () => "main";

const blocked = [
  "git push origin main",
  "git push origin HEAD:main",
  "git push origin 'main'",
  "cd x && git push origin HEAD:main",
  "git -C /c/x push origin main",
  "git -c core.x=y push origin main",
  "git push --all",
  "git push --mirror origin",
  "git push -f",
  "git push --force",
  "git push -fu origin feat/x",
  "git -C /c/x push --force origin feat/x",
  "git push --force-with-lease origin feat/x",
  "git push origin +feat/x",
  "git push origin --delete feat/x",
  "git push origin :feat/x",
  "git branch -D feat/x",
  "git branch -d feat/x",
  "git branch --delete feat/x",
  "git checkout -- docs/plan/Ledger.md",
  "git checkout HEAD -- src/x.ts",
  "git checkout .",
  "git checkout -f main",
  "git restore docs/x.md",
  "git restore --staged --worktree x",
  "git reset --hard origin/main",
  "git clean -fd",
  "git clean --force",
  "git stash drop",
  "git stash clear",
  "gh pr merge 60 --merge --admin",
  "gh pr merge 60 --merge --delete-branch",
  "gh pr merge 60 -m -d",
  "gh pr close 60 --delete-branch",
  "gh repo edit --visibility private",
  "gh repo delete o/r",
  "gh repo rename x",
  "gh repo archive",
  "gh api -X DELETE repos/o/r/git/refs/heads/x",
  "gh api --method=DELETE repos/o/r",
  "gh api -X PATCH repos/o/r -f visibility=private",
  "sleep 540; echo waited",
  "sleep 1m",
  "Start-Sleep -Seconds 120",
  "Start-Sleep 45",
];
const allowed = [
  "git push -u origin feat/t-107-verify-ledger-check",
  "git push origin feat/main-menu",
  "git push",
  "git push -u origin HEAD",
  "git -C /c/x push -u origin feat/x",
  "git checkout -q -b feat/x",
  "git switch main && git pull --ff-only",
  "git restore --staged docs/x.md",
  "git restore -S docs/x.md",
  "git branch -a",
  "gh pr merge 60 --merge",
  "gh pr create --body-file body.md",
  "npm test && npm run build 2>&1 | tail -3",
  "sleep 5",
  "Start-Sleep -Milliseconds 500",
  "gh pr checks 60 --watch --interval 30",
  "gh api repos/o/r/pulls/60",
  // Mentions in messages and bodies are not commands.
  'git commit -m "docs: never git push origin main by hand"',
  'git commit -m "feat(T-130): drop sleep from check-flow"',
  'git log -S "git reset --hard"',
  'gh pr comment 64 --body "git checkout HEAD -- x; git restore x passes"',
  "git commit -F - <<'EOF'\nfix: compound commands, plus gh pr merge --admin and sleep over 30 s.\nEOF",
];

test("forbidden commands are blocked", () => {
  for (const c of blocked) assert.ok(check(c, onFeature), `not blocked: ${c}`);
});

test("everyday commands and mere mentions pass", () => {
  for (const c of allowed)
    assert.equal(check(c, onFeature), undefined, `blocked: ${c}`);
});

test("a bare push is blocked only on main", () => {
  for (const c of ["git push", "git push -u origin HEAD", "git push origin @"])
    assert.match(check(c, onMain) ?? "", /current branch/, c);
  assert.equal(check("git push -u origin feat/x", onMain), undefined);
});

test("segments respect quotes and keep 2>&1 in a word", () => {
  assert.deepEqual(
    segments(`git commit -m "a; b && c" && npm test 2>&1 | tail`),
    [["git", "commit", "-m", "a; b && c"], ["npm", "test", "2>&1"], ["tail"]],
  );
});

test("the hook exits 2 with a reason, 2 on bad input, 0 otherwise", () => {
  const run = (input: string) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./guard.ts", import.meta.url))],
      { input, encoding: "utf8" },
    );
  const json = (command: string) =>
    JSON.stringify({ tool_name: "Bash", tool_input: { command } });
  const bad = run(json("git push origin main"));
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /pushes to main/);
  assert.equal(run("not json").status, 2);
  assert.equal(run(json("git status")).status, 0);
});
