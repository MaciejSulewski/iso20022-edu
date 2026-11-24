import assert from "node:assert/strict";
import { test } from "node:test";
import { sortEntries } from "./changelog.ts";

test("sorts newest date first without changing the input", () => {
  const input = [
    { id: "2026-11-22-a", date: "2026-11-22" },
    { id: "2026-11-24-a", date: "2026-11-24" },
    { id: "2026-11-23-a", date: "2026-11-23" },
  ];
  assert.deepEqual(
    sortEntries(input).map((e) => e.id),
    ["2026-11-24-a", "2026-11-23-a", "2026-11-22-a"],
  );
  assert.equal(input[0]!.id, "2026-11-22-a");
});

test("on the same date, sorts by id descending", () => {
  const input = [
    { id: "2026-11-24-a", date: "2026-11-24" },
    { id: "2026-11-24-c", date: "2026-11-24" },
    { id: "2026-11-24-b", date: "2026-11-24" },
  ];
  assert.deepEqual(
    sortEntries(input).map((e) => e.id),
    ["2026-11-24-c", "2026-11-24-b", "2026-11-24-a"],
  );
});
