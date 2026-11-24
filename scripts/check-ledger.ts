// Checks docs/plan/Ledger.md against the rules at its top.
// --prs also asks gh which task branches are merged, so a missed tick is caught.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TASK = /^- \[( |x)\] (T-\d{3}) /;

export type Task = { id: string; done: boolean; section: string; line: string };

export function parseLedger(text: string): { tasks: Task[]; errors: string[] } {
  const tasks: Task[] = [];
  const errors: string[] = [];
  let section = "";
  for (const line of text.split(/\r?\n/)) {
    const h = /^## (.+)/.exec(line);
    if (h) section = h[1]!.trim();
    // Anything checkbox-shaped is a task (and must match TASK); "- [[ADR…]]" links are not.
    if (!/^\s*[-*+]\s*\[[^[]?\]/.test(line)) continue;
    const m = TASK.exec(line);
    if (!m) {
      errors.push(`bad task line: ${line}`);
      continue;
    }
    tasks.push({ id: m[2]!, done: m[1] === "x", section, line });
  }
  return { tasks, errors };
}

export function checkLedger(text: string): string[] {
  const { tasks, errors } = parseLedger(text);
  const seen = new Set<string>();
  for (const t of tasks) {
    if (seen.has(t.id)) errors.push(`${t.id}: id used twice`);
    seen.add(t.id);
    if (t.done) {
      if (t.section !== "Done")
        errors.push(`${t.id}: done but in "${t.section}"`);
      const cancelled = /\bCancelled \d{4}-\d{2}-\d{2}/.test(t.line);
      if (!cancelled && !/✅ \d{4}-\d{2}-\d{2}/.test(t.line))
        errors.push(`${t.id}: done without "✅ YYYY-MM-DD"`);
      if (!/\]\(https?:\/\/|\[\[/.test(t.line))
        errors.push(`${t.id}: done without a PR link or [[note]]`);
    } else {
      if (t.section === "Done") errors.push(`${t.id}: open but in "Done"`);
      if (!/#(me|agent)\b/.test(t.line))
        errors.push(`${t.id}: open without #me or #agent`);
    }
  }
  const now = tasks.filter((t) => t.section === "Now" && !t.done).length;
  if (now > 3) errors.push(`"Now" has ${now} open tasks (max 3)`);
  return errors;
}

export type Pr = { number: number; headRefName: string };

// A merged task branch whose task is still open must at least be named on its line.
export function checkMergedPrs(text: string, prs: Pr[]): string[] {
  const open = new Map(
    parseLedger(text)
      .tasks.filter((t) => !t.done)
      .map((t) => [t.id, t.line]),
  );
  const errors: string[] = [];
  for (const pr of prs) {
    const m = /\/t-(\d{3})\b/i.exec(pr.headRefName);
    const line = m && open.get(`T-${m[1]}`);
    if (line && !new RegExp(`(#|pull/)${pr.number}\\b`).test(line))
      errors.push(
        `T-${m[1]}: PR #${pr.number} (${pr.headRefName}) is merged but the task is open and its line does not mention the PR`,
      );
  }
  return errors;
}

if (import.meta.main) {
  const text = readFileSync(
    new URL("../docs/plan/Ledger.md", import.meta.url),
    "utf8",
  );
  const errors = checkLedger(text);
  if (process.argv.includes("--prs")) {
    const out = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        // shortcut: the newest 500 merged PRs only; raise it when the repo passes that.
        "--limit",
        "500",
        "--json",
        "number,headRefName",
      ],
      { encoding: "utf8" },
    );
    errors.push(...checkMergedPrs(text, JSON.parse(out) as Pr[]));
  }
  for (const e of errors) console.log(`FAIL ${e}`);
  if (errors.length) process.exit(1);
  console.log("Ledger: ok");
}
