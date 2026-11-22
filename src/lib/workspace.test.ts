import { test } from "node:test";
import assert from "node:assert/strict";
import type { XmlNode } from "./xml-tree.ts";
import { findNode, panelNode } from "./workspace.ts";

const node = (
  path: string,
  children: XmlNode[] = [],
  isoName = path,
): XmlNode => ({
  path,
  tag: path.split("/").at(-1)!,
  children,
  info: {
    isoName,
    definition: "def",
    typeName: "T",
    min: 1,
    max: 1,
    mandatory: true,
    repeating: false,
    choiceMember: false,
    choice: false,
  },
});

const nodes = [
  node("A", [node("A/B", [], "first"), node("A/B", [], "second")]),
  node("C"),
];

test("findNode returns the first node with the path, depth first", () => {
  assert.equal(findNode(nodes, "A/B")?.info.isoName, "first");
  assert.equal(findNode(nodes, "C")?.path, "C");
  assert.equal(findNode(nodes, "A/X"), undefined);
});

test("panelNode prefers the sample node, else a record for the same path", () => {
  const rec = node("A/Z", [], "record");
  assert.equal(
    panelNode(nodes, "A/B", node("A/B", [], "rec"))?.info.isoName,
    "first",
  );
  assert.equal(panelNode(nodes, "A/Z", rec), rec);
  assert.equal(panelNode(nodes, "A/Y", rec), undefined); // a stale record for another path
  assert.equal(panelNode(nodes, null, rec), undefined);
  assert.equal(panelNode(nodes, "A/Z", undefined), undefined);
});
