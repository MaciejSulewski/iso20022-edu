// Runs every pre-PR gate one after another (never two builds at once) and prints
// one row per gate with its exit code. Logs go to the OS temp folder.
import { spawnSync } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const gates = [
  "test",
  "run lint",
  "run format:check",
  "run check:ledger",
  "run build",
  "run check:size",
  "run check:a11y",
  "run check:ui",
];
// xmllint is a system tool (CI installs it); skip it, loudly, where it is missing.
const hasXmllint = spawnSync("xmllint --version", { shell: true }).status === 0;
if (hasXmllint) gates.splice(4, 0, "run check:xml");

let failed = false;
for (const g of gates) {
  const log = join(tmpdir(), `verify-${g.replace(/\W+/g, "-")}.log`);
  const fd = openSync(log, "w");
  const t0 = Date.now();
  const { status } = spawnSync(`npm ${g}`, {
    shell: true,
    stdio: ["ignore", fd, fd],
  });
  closeSync(fd);
  const fails = readFileSync(log, "utf8").match(/^FAIL/gm)?.length ?? 0;
  failed ||= status !== 0;
  const row = `${status === 0 ? "ok  " : "FAIL"} npm ${g.padEnd(18)} exit=${status} FAIL-lines=${fails} ${((Date.now() - t0) / 1000).toFixed(0)}s  ${log}`;
  console.log(row);
}
if (!hasXmllint)
  console.log("skip npm run check:xml (xmllint not installed; CI runs it)");
if (failed) {
  console.error("verify: at least one gate failed.");
  process.exit(1);
}
