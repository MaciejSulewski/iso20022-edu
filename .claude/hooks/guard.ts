// PreToolUse hook for Bash and PowerShell: blocks git and gh commands that
// CLAUDE.md forbids without the user's OK. Exit 2 blocks; the reason goes to Claude.
// A backstop for compound commands that prefix deny rules miss, not a sandbox.
import { readFileSync } from "node:fs";

const RULES: [RegExp, (seg: string, words: string[]) => boolean, string][] = [
  [
    /\bgit\s+push\b/,
    (_, w) =>
      w.some((t) => t === "main" || /:main$|refs\/heads\/main$/.test(t)),
    "pushes to main",
  ],
  [
    /\bgit\s+push\b/,
    (_, w) =>
      w.some((t) => /^(-f|--force(-with-lease)?(=.*)?|--delete|-d)$/.test(t)) ||
      w.some((t) => /^[:+]./.test(t)),
    "force-pushes or deletes a remote branch",
  ],
  [
    /\bgit\s+branch\b/,
    (_, w) => w.some((t) => /^(-d|-D|--delete)$/.test(t)),
    "deletes a branch",
  ],
  [
    /\bgit\s+checkout\s+(--\s|\.\s*$)/,
    () => true,
    "discards working-copy changes",
  ],
  [
    /\bgit\s+restore\b/,
    (_, w) =>
      !w.includes("--staged") || w.includes("--worktree") || w.includes("-W"),
    "discards working-copy changes",
  ],
  [/\bgit\s+reset\b.*--hard/, () => true, "discards working-copy changes"],
  [
    /\bgit\s+clean\b/,
    (_, w) => w.some((t) => /^-\w*f/.test(t)),
    "deletes untracked files",
  ],
  [/\bgit\s+stash\s+(drop|clear)\b/, () => true, "deletes stashed changes"],
  [/\bgh\s+pr\s+merge\b.*--admin/, () => true, "merges past branch protection"],
  [
    /\bgh\s+repo\s+(edit|delete|rename|archive)\b/,
    () => true,
    "changes repo settings",
  ],
  [
    /\bgh\s+api\b.*(-X|--method)\s*DELETE/i,
    () => true,
    "deletes through the GitHub API",
  ],
  [
    /\b(sleep|Start-Sleep)\b/,
    (seg) => Number(/(\d+)/.exec(seg)?.[1] ?? 0) > 30,
    "sleeps over 30 s (use run_in_background or gh pr checks --watch)",
  ],
];

export function check(command: string): string | undefined {
  for (const seg of command.split(/&&|\|\||[;|\n]/)) {
    const words = seg.trim().split(/\s+/);
    for (const [re, hit, why] of RULES)
      if (re.test(seg) && hit(seg, words)) return `${why}: \`${seg.trim()}\``;
  }
}

if (import.meta.main) {
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
}
