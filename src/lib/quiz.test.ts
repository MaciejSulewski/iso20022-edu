import assert from "node:assert/strict";
import { test } from "node:test";
import { score } from "./quiz.ts";

const qs = [
  { options: ["a", "b", "c"], answer: 1 },
  { options: ["a", "b", "c"], answer: 0 },
  { options: ["a", "b", "c", "d"], answer: 3 },
];

test("all right", () => {
  assert.deepEqual(score(qs, [1, 0, 3]), {
    correct: 3,
    total: 3,
    results: ["right", "right", "right"],
  });
});

test("one wrong", () => {
  const r = score(qs, [1, 2, 3]);
  assert.equal(r.correct, 2);
  assert.deepEqual(r.results, ["right", "wrong", "right"]);
});

test("none picked counts as skipped", () => {
  assert.deepEqual(score(qs, [undefined, undefined, undefined]), {
    correct: 0,
    total: 3,
    results: ["skipped", "skipped", "skipped"],
  });
});

test("a pick out of range counts as skipped", () => {
  const r = score(qs, [3, -1, 1.5]);
  assert.deepEqual(r.results, ["skipped", "skipped", "skipped"]);
});

test("no questions", () => {
  assert.deepEqual(score([], []), { correct: 0, total: 0, results: [] });
});

test("picks shorter than the questions leaves the rest skipped", () => {
  const r = score(qs, [1]);
  assert.equal(r.correct, 1);
  assert.deepEqual(r.results, ["right", "skipped", "skipped"]);
});
