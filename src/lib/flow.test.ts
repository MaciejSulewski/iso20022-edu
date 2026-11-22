import { test } from "node:test";
import assert from "node:assert/strict";
import { clampStep, parseHash, toHash } from "./flow.ts";

const ids = ["serial", "cover"];
const count = (v: string) => ({ serial: 4, cover: 5 })[v] ?? 0;
const p = (h: string) => parseHash(h, ids, count);

test("parseHash reads variant and one-based step", () => {
  assert.deepEqual(p("#cover/3"), { variant: "cover", step: 2 });
  assert.deepEqual(p("#serial/4"), { variant: "serial", step: 3 });
  assert.deepEqual(p("cover/1"), { variant: "cover", step: 0 });
});

test("parseHash falls back to step 0 of a valid variant", () => {
  for (const h of [
    "#serial",
    "#serial/0",
    "#serial/99",
    "#serial/x",
    "#serial/2.5",
  ])
    assert.deepEqual(p(h), { variant: "serial", step: 0 }, h);
  assert.deepEqual(p("#cover/5"), { variant: "cover", step: 4 });
  assert.deepEqual(p("#cover/6"), { variant: "cover", step: 0 });
});

test("parseHash falls back to the first variant on an unknown one", () => {
  for (const h of ["", "#", "#x", "#x/2", "#Serial/2"])
    assert.deepEqual(p(h), { variant: "serial", step: 0 }, h);
});

test("toHash writes a one-based step", () => {
  assert.equal(toHash("cover", 2), "#cover/3");
  assert.equal(toHash("serial", 0), "#serial/1");
  assert.deepEqual(p(toHash("cover", 4)), { variant: "cover", step: 4 });
});

test("clampStep keeps a step inside 0..count-1", () => {
  assert.equal(clampStep(-1, 4), 0);
  assert.equal(clampStep(0, 4), 0);
  assert.equal(clampStep(3, 4), 3);
  assert.equal(clampStep(4, 4), 3);
  assert.equal(clampStep(99, 4), 3);
});
