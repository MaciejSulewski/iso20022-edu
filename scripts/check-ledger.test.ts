import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLedger, checkMergedPrs } from "./check-ledger.ts";

const ledger = (now: string, done: string) =>
  `# Ledger\n## Now\n${now}\n## Next\n### Phase 9\n- [ ] T-100 Pass #agent #phase/9\n## Done\n${done}\n## Decisions\n- [[ADR-001 Astro]]\n`;
const DONE = "- [x] T-001 Thing ✅ 2026-11-21 [PR #1](https://x/pull/1)";

test("a well-formed ledger passes", () => {
  assert.deepEqual(checkLedger(ledger("", DONE)), []);
});

test("each rule fails on its own break", () => {
  const cases: [string, string, RegExp][] = [
    ["", `${DONE}\n${DONE}`, /T-001: id used twice/],
    ["", "- [x] T-001 Thing [PR #1](https://x/pull/1)", /without "✅/],
    ["", "- [x] T-001 Thing ✅ 2026-11-21", /without a PR link/],
    ["", "- [ ] T-002 Open #agent", /T-002: open but in "Done"/],
    [DONE, "", /T-001: done but in "Now"/],
    ["- [ ] T-003 No owner", DONE, /T-003: open without #me or #agent/],
    ["- [ ] T3 typo #agent", DONE, /bad task line/],
    ["- [ ]T-003 no space #agent", DONE, /bad task line/],
    ["  - [ ] T-003 indented #agent", DONE, /bad task line/],
    ["* [ ] T-003 star bullet #agent", DONE, /bad task line/],
    [
      [
        "- [ ] T-011 a #agent",
        "- [ ] T-012 b #agent",
        "- [ ] T-013 c #agent",
        "- [ ] T-014 d #agent",
      ].join("\n"),
      DONE,
      /"Now" has 4 open tasks/,
    ],
  ];
  for (const [now, done, re] of cases) {
    const errors = checkLedger(ledger(now, done));
    assert.equal(errors.length, 1, `${re}: ${errors.join("; ")}`);
    assert.match(errors[0]!, re);
  }
});

test("cancelled tasks need no ✅", () => {
  assert.deepEqual(
    checkLedger(
      ledger(
        "",
        "- [x] T-005 Old #agent Cancelled 2026-11-21: superseded by [[ADR-013]]",
      ),
    ),
    [],
  );
});

test("a merged task branch flags an open task that does not name the PR", () => {
  const text = ledger("", DONE);
  const flagged = checkMergedPrs(text, [
    { number: 60, headRefName: "feat/t-100-a11y" },
  ]);
  assert.equal(flagged.length, 1);
  assert.match(flagged[0]!, /T-100: PR #60/);
  // Named on the line, done, or not a task branch: not flagged.
  const named = text.replace(
    "Pass #agent",
    "Pass (PR #60 merged, partial) #agent",
  );
  assert.deepEqual(
    checkMergedPrs(named, [{ number: 60, headRefName: "feat/t-100-a11y" }]),
    [],
  );
  assert.deepEqual(
    checkMergedPrs(text, [{ number: 1, headRefName: "feat/t-001-thing" }]),
    [],
  );
  assert.deepEqual(
    checkMergedPrs(text, [{ number: 61, headRefName: "docs/phase9-close" }]),
    [],
  );
  // PR #6 must not match "#60".
  const near = text.replace("Pass #agent", "Pass (PR #60) #agent");
  assert.equal(
    checkMergedPrs(near, [{ number: 6, headRefName: "fix/t-100-x" }]).length,
    1,
  );
});
