// PreToolUse hook for Bash and PowerShell: blocks git and gh commands that
// CLAUDE.md forbids without the user's OK. Exit 2 blocks; the reason goes to Claude.
// A backstop, not a sandbox: it reads each command's own words, so a commit
// message or PR body that only mentions a command is not blocked.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Split on && || ; | and newlines outside quotes; strip quotes from words.
export function segments(command: string): string[][] {
  const out: string[][] = [];
  let words: string[] = [];
  let word = "";
  let quote = "";
  let inWord = false;
  const endWord = () => {
    if (inWord) words.push(word);
    word = "";
    inWord = false;
  };
  const endSeg = () => {
    endWord();
    if (words.length) out.push(words);
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!;
    if (quote) {
      if (c === quote) quote = "";
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
    } else if (c === "\n" || c === ";" || c === "|" || c === "&") {
      if (c === "&" && command[i + 1] !== "&") {
        word += c; // 2>&1 and friends
        inWord = true;
        continue;
      }
      endSeg();
      if (command[i + 1] === c) i++;
    } else if (/\s/.test(c)) endWord();
    else {
      word += c;
      inWord = true;
    }
  }
  endSeg();
  return out;
}

const has = (args: string[], ...flags: string[]) =>
  args.some(
    (a) => flags.includes(a) || flags.some((f) => a.startsWith(`${f}=`)),
  );
const shortFlag = (args: string[], letter: string) =>
  args.some((a) => new RegExp(`^-[a-zA-Z]*${letter}[a-zA-Z]*$`).test(a));

function currentBranch(dir?: string): string {
  const r = spawnSync(
    "git",
    [...(dir ? ["-C", dir] : []), "rev-parse", "--abbrev-ref", "HEAD"],
    {
      encoding: "utf8",
    },
  );
  return r.status === 0 ? r.stdout.trim() : "";
}

function checkGit(
  w: string[],
  branch: (dir?: string) => string,
): string | undefined {
  let i = 1;
  let dir: string | undefined;
  while (i < w.length && w[i]!.startsWith("-")) {
    if (w[i] === "-C") dir = w[i + 1];
    i += w[i] === "-C" || w[i] === "-c" ? 2 : 1;
  }
  const sub = w[i];
  const args = w.slice(i + 1);
  const rest = args.filter((a) => !a.startsWith("-"));
  switch (sub) {
    case "push": {
      if (
        shortFlag(args, "f") ||
        has(args, "--force", "--force-with-lease") ||
        rest.some((a) => a.startsWith("+"))
      )
        return "force-pushes";
      if (
        shortFlag(args, "d") ||
        has(args, "--delete") ||
        rest.some((a) => a.startsWith(":"))
      )
        return "deletes a remote branch";
      if (has(args, "--all", "--mirror"))
        return "pushes every branch, main included";
      if (rest.some((a) => a === "main" || /:main$|refs\/heads\/main$/.test(a)))
        return "pushes to main";
      const refspecs = rest.slice(1);
      if (
        refspecs.every((a) => a === "HEAD" || a === "@") &&
        branch(dir) === "main"
      )
        return "pushes to main (current branch)";
      return;
    }
    case "branch":
      return has(args, "--delete") ||
        shortFlag(args, "d") ||
        shortFlag(args, "D")
        ? "deletes a branch"
        : undefined;
    case "checkout":
      // shortcut: `git checkout <path>` without `--` looks like a branch switch and passes.
      return has(args, "--", ".", "--force") || shortFlag(args, "f")
        ? "discards working-copy changes"
        : undefined;
    case "restore":
      return has(args, "--staged", "-S") && !has(args, "--worktree", "-W")
        ? undefined
        : "discards working-copy changes";
    case "reset":
      return has(args, "--hard", "--merge", "--keep")
        ? "discards working-copy changes"
        : undefined;
    case "clean":
      return has(args, "--force") || shortFlag(args, "f")
        ? "deletes untracked files"
        : undefined;
    case "stash":
      return args[0] === "drop" || args[0] === "clear"
        ? "deletes stashed changes"
        : undefined;
  }
}

function checkGh(w: string[]): string | undefined {
  const [, group, sub] = w;
  const args = w.slice(3);
  if (group === "pr" && (sub === "merge" || sub === "close")) {
    if (has(args, "--admin")) return "merges past branch protection";
    if (has(args, "--delete-branch") || shortFlag(args, "d"))
      return "deletes the PR branch";
  }
  if (
    group === "repo" &&
    ["edit", "delete", "rename", "archive"].includes(sub ?? "")
  )
    return "changes repo settings";
  if (group === "api") {
    const all = w.slice(2);
    const m = all.findIndex((a) => /^(-X|--method)(=|$)|^-X\w/.test(a));
    const method =
      m < 0
        ? ""
        : all[m]!.replace(/^(-X|--method)=?/, "") || (all[m + 1] ?? "");
    if (/^(DELETE|PATCH|PUT)$/i.test(method))
      return `changes GitHub state (${method.toUpperCase()} via gh api)`;
  }
}

function sleepSeconds(w: string[]): number {
  if (/^sleep$/i.test(w[0]!) && !w[1]?.startsWith("-")) {
    const m = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(w[1] ?? "");
    const unit: Record<string, number> = {
      "": 1,
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return m ? Number(m[1]) * unit[m[2]!]! : 0;
  }
  // PowerShell: Start-Sleep [-Seconds] N | -Milliseconds N (also `sleep -s N`)
  const ms = w.findIndex((a) => /^-m(illiseconds)?$/i.test(a));
  if (ms > 0) return Number(w[ms + 1] ?? 0) / 1000;
  const n = w.slice(1).find((a) => /^\d+(\.\d+)?$/.test(a));
  return Number(n ?? 0);
}

export function check(
  command: string,
  branch = currentBranch,
): string | undefined {
  for (const seg of segments(command)) {
    let w = seg;
    while (w.length && /^\w+=/.test(w[0]!)) w = w.slice(1); // VAR=x cmd
    if (!w.length) continue;
    const cmd = w[0]!
      .replace(/\.exe$/i, "")
      .split(/[\\/]/)
      .pop()!;
    const why =
      cmd === "git"
        ? checkGit(w, branch)
        : cmd === "gh"
          ? checkGh(w)
          : /^(sleep|start-sleep)$/i.test(cmd) && sleepSeconds(w) > 30
            ? "sleeps over 30 s (use run_in_background or gh pr checks --watch)"
            : undefined;
    if (why) return `${why}: \`${seg.join(" ")}\``;
  }
}

if (import.meta.main) {
  try {
    const input = JSON.parse(readFileSync(0, "utf8")) as {
      tool_input?: { command?: string };
    };
    const why = check(input.tool_input?.command ?? "");
    if (why) {
      console.error(
        `Blocked by .claude/hooks/guard.ts: this ${why}. CLAUDE.md needs the user's OK for it; ask them in chat.`,
      );
      process.exit(2);
    }
  } catch (e) {
    // Fail closed: a broken guard must not silently allow everything.
    console.error(
      `.claude/hooks/guard.ts failed (${e instanceof Error ? e.message : e}); blocking. Fix the hook.`,
    );
    process.exit(2);
  }
}
