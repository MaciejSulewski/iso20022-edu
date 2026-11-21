import { test } from "node:test";
import assert from "node:assert/strict";
import type { XmlNode } from "./xml-tree.ts";
import {
  elementState,
  firstSentence,
  isHidden,
  previewText,
  visibleRows,
} from "./xml-view.ts";

const info = (mandatory: boolean, choiceMember = false, repeating = false) => ({
  mandatory,
  choiceMember,
  repeating,
});

test("element state", () => {
  assert.deepEqual(elementState(info(true)), {
    presence: "required",
    repeats: false,
  });
  assert.deepEqual(elementState(info(false)), {
    presence: "optional",
    repeats: false,
  });
  assert.deepEqual(elementState(info(false, true)), {
    presence: "choice",
    repeats: false,
  });
  assert.deepEqual(elementState(info(true, false, true)), {
    presence: "required",
    repeats: true,
  });
});

test("first sentence and preview", () => {
  assert.equal(firstSentence("Unique id. Used for matching."), "Unique id.");
  assert.equal(firstSentence("No end"), "No end");
  assert.equal(
    firstSentence("Version 1.2 of the rule. More."),
    "Version 1.2 of the rule.",
  );
  assert.equal(firstSentence("  Wrapped\n text. Next."), "Wrapped text.");
  assert.equal(
    previewText({ explanation: "Plain. More.", definition: "ISO." }),
    "Plain.",
  );
  assert.equal(previewText({ definition: "ISO def. More." }), "ISO def.");
});

// A(req) > [B(opt) > [C(req)], D(req)], E(opt)
const n = (tag: string, mandatory: boolean, children: XmlNode[] = []) =>
  ({ tag, path: tag, children, info: info(mandatory) }) as unknown as XmlNode;
const C = n("C", true);
const B = n("B", false, [C]);
const D = n("D", true);
const A = n("A", true, [B, D]);
const E = n("E", false);
const row = (node: XmlNode, depth: number, close = false) => ({
  id: node.tag + (close ? "/" : ""),
  node,
  depth,
  close,
});
const rows = [
  row(A, 0),
  row(B, 1),
  row(C, 2),
  row(B, 1, true),
  row(D, 1),
  row(A, 0, true),
  row(E, 0),
];

test("beginner mode drops optional branches, their closes and counts them", () => {
  assert.equal(visibleRows(rows, false).hidden, 0);
  const v = visibleRows(rows, true);
  assert.deepEqual(
    v.rows.map((r) => r.id),
    ["A", "D", "A/"],
  );
  assert.equal(v.hidden, 3); // B, C and E
  const collapsed = visibleRows(
    [row(A, 0), row(B, 1), row(D, 1), row(A, 0, true)],
    true,
  );
  assert.equal(collapsed.hidden, 2); // B and its hidden child C, though B is collapsed
});

test("isHidden looks at every ancestor", () => {
  const byId = new Map([
    ["A", { node: A }],
    ["A/B", { node: B }],
    ["A/B/C", { node: C }],
    ["A/D", { node: D }],
  ]);
  assert.equal(isHidden("A/B/C", byId), true);
  assert.equal(isHidden("A/D", byId), false);
});

test("a single optional leaf counts as one hidden element", () => {
  assert.equal(visibleRows([row(E, 0)], true).hidden, 1);
});
