import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { check } from "./guard.ts";

const blocked = [
  "git push origin main",
  "git push origin HEAD:main",
  "cd x && git push origin HEAD:main",
  "git push -f",
  "git push --force-with-lease origin feat/x",
  "git push origin +feat/x",
  "git push origin --delete feat/x",
  "git push origin :feat/x",
  "git branch -D feat/x",
  "git checkout -- docs/plan/Ledger.md",
  "git checkout .",
  "git restore docs/x.md",
  "git reset --hard origin/main",
  "git clean -fd",
  "git stash drop",
  "gh pr merge 60 --merge --admin",
  "gh repo edit --visibility private",
  "gh api -X DELETE repos/o/r/git/refs/heads/x",
  "sleep 540; echo waited",
  "Start-Sleep -Seconds 120",
];
const allowed = [
  "git push -u origin feat/t-107-verify-ledger-check",
  "git push origin feat/main-menu",
  "git checkout -q -b feat/x",
  "git switch main && git pull --ff-only",
  "git restore --staged docs/x.md",
  "git branch -a",
  "gh pr merge 60 --merge",
  "npm test && npm run build",
  "sleep 5",
  "gh pr checks 60 --watch --interval 30",
];

test("forbidden commands are blocked", () => {
  for (const c of blocked) assert.ok(check(c), `not blocked: ${c}`);
});

test("everyday commands pass", () => {
  for (const c of allowed) assert.equal(check(c), undefined, `blocked: ${c}`);
});

test("the hook exits 2 with a reason, 0 otherwise", () => {
  const run = (command: string) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./guard.ts", import.meta.url))],
      {
        input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
        encoding: "utf8",
      },
    );
  const bad = run("git push origin main");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /pushes to main/);
  assert.equal(run("git status").status, 0);
});
