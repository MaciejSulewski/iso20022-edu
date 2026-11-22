import { test } from "node:test";
import assert from "node:assert/strict";
import type { TreeChild } from "./schema-tree.ts";
import {
  ancestors,
  chainOf,
  parentOf,
  parseHash,
  searchTree,
  toXmlNode,
  treeRows,
  type Load,
} from "./tree-view.ts";

const el = (
  tag: string,
  typeName: string,
  o: Partial<Extract<TreeChild, { tag: string }>> = {},
): TreeChild => ({
  tag,
  isoName: tag + "Name",
  definition: "def",
  typeName,
  kind: typeName.startsWith("S") ? "simple" : "complex",
  min: 1,
  max: 1,
  mandatory: true,
  repeating: false,
  choiceMember: false,
  choice: false,
  ...o,
});

// Root -> A (type TA) -> { B (simple, optional), Self (type TA again), C choice member }; plus an optional any.
const root = [el("A", "TA"), { any: true, min: 0, max: 1 } as TreeChild];
const types: Record<string, Load> = {
  TA: [
    el("B", "S1", { min: 0, mandatory: false }),
    el("Self", "TA"),
    el("C", "S2", { min: 1, mandatory: false, choiceMember: true }),
  ],
};
const paths = (rows: ReturnType<typeof treeRows>) => rows.map((r) => r.path);

test("collapsed tree shows root rows only", () => {
  const rows = treeRows(root, types, new Set(), "Root", false);
  assert.deepEqual(paths(rows), ["A", "*"]);
  assert.deepEqual(
    rows.map((r) => [r.depth, r.pos, r.size, r.open]),
    [
      [1, 1, 2, false],
      [1, 2, 2, false],
    ],
  );
});

test("expanded node lists its children; a repeated type is a leaf", () => {
  const rows = treeRows(root, types, new Set(["A", "A/Self"]), "Root", false);
  assert.deepEqual(paths(rows), ["A", "A/B", "A/Self", "A/C", "*"]);
  const self = rows.find((r) => r.path === "A/Self")!;
  assert.equal(self.recursive, true);
  assert.equal(self.open, false); // expanded set is ignored for a recursive leaf
  assert.equal(rows[1]!.depth, 2);
});

test("open node without its type file reports loading or error", () => {
  const exp = new Set(["A"]);
  assert.equal(treeRows(root, {}, exp, "Root", false)[0]!.load, "loading");
  assert.equal(
    treeRows(root, { TA: "error" }, exp, "Root", false)[0]!.load,
    "error",
  );
  assert.equal(treeRows(root, types, exp, "Root", false)[0]!.load, undefined);
});

test("required-only hides optional elements and keeps choice alternatives", () => {
  const rows = treeRows(root, types, new Set(["A"]), "Root", true);
  assert.deepEqual(paths(rows), ["A", "A/Self", "A/C"]);
  assert.deepEqual(
    rows.slice(1).map((r) => [r.pos, r.size]),
    [
      [1, 2],
      [2, 2],
    ],
  );
});

test("chainOf walks loaded data only", () => {
  assert.deepEqual(
    chainOf(root, types, "A/C")?.map((c) => !c.any && c.tag),
    ["A", "C"],
  );
  assert.equal(chainOf(root, {}, "A/C"), undefined);
  assert.equal(chainOf(root, types, "A/Nope"), undefined);
});

test("toXmlNode merges the overlay by path, then by type, and normalises codes", () => {
  const c = el("B", "S1", { codes: ["X", { code: "Y", name: "Why" }] });
  const overlay = {
    byPath: { "A/B": { explanation: { en: "by path" }, examples: ["1"] } },
    byType: { S1: { explanation: { en: "by type" } } },
  };
  const n = toXmlNode(c as never, "A/B", overlay);
  assert.equal(n.info.explanation, "by path");
  assert.deepEqual(n.info.examples, ["1"]);
  assert.deepEqual(n.info.codes, [{ code: "X" }, { code: "Y", name: "Why" }]);
  assert.deepEqual(n.children, []);
  assert.equal(
    toXmlNode(c as never, "Z/B", overlay).info.explanation,
    "by type",
  );
  assert.equal(toXmlNode(c as never, "Z/B").info.explanation, undefined);
});

test("parseHash", () => {
  assert.equal(parseHash("#GrpHdr/MsgId"), "GrpHdr/MsgId");
  assert.equal(parseHash("#%2FGrpHdr%2F"), "GrpHdr");
  assert.equal(parseHash(""), undefined);
  assert.equal(parseHash("#"), undefined);
  assert.equal(parseHash("#%E0%A4%A"), undefined);
});

test("searchTree matches path or ISO name, case-insensitive, with a limit", () => {
  const index: [string, string][] = [
    ["GrpHdr/MsgId", "MessageIdentification"],
    ["CdtTrfTxInf/Dbtr/Nm", "Name"],
    ["CdtTrfTxInf/Cdtr/Nm", "Name"],
  ];
  assert.deepEqual(searchTree(index, "msgid").hits.length, 1);
  assert.deepEqual(
    searchTree(index, "messageident").hits[0]![0],
    "GrpHdr/MsgId",
  );
  assert.deepEqual(searchTree(index, "name", 1), {
    hits: [["CdtTrfTxInf/Dbtr/Nm", "Name"]],
    total: 2,
  });
  assert.deepEqual(searchTree(index, "  "), { hits: [], total: 0 });
  assert.equal(searchTree(index, "Message Ident").total, 1);
});

test("parentOf and ancestors", () => {
  assert.equal(parentOf("A/B/C"), "A/B");
  assert.equal(parentOf("GrpHdr"), "");
  assert.deepEqual(ancestors("A/B/C"), ["A", "A/B"]);
  assert.deepEqual(ancestors("A"), []);
});
