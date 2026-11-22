import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Schema } from "../../scripts/schema-model.ts";
import { childRecords, pathChain, searchIndex } from "./schema-tree.ts";

const schema: Schema = JSON.parse(
  readFileSync(
    new URL("../data/schema/pacs.008.001.14.json", import.meta.url),
    "utf8",
  ),
);
const root = "FIToFICustomerCreditTransferV14";

const named = (rows: ReturnType<typeof childRecords>) =>
  rows.flatMap((r) => (r.any ? [] : [r]));
const find = (typeName: string, tag: string) =>
  named(childRecords(schema, typeName)).find((r) => r.tag === tag)!;

test("children of the root type", () => {
  const tags = named(childRecords(schema, root)).map((r) => r.tag);
  assert.ok(tags.includes("GrpHdr") && tags.includes("CdtTrfTxInf"));
  const g = find(root, "GrpHdr");
  assert.equal(g.kind, "complex");
  assert.ok(g.definition && g.isoName);
});

test("mandatory, optional and repeating", () => {
  assert.equal(find(root, "GrpHdr").mandatory, true);
  assert.equal(find(root, "SplmtryData").mandatory, false);
  assert.equal(find(root, "SplmtryData").repeating, true);
});

test("choice members are never mandatory", () => {
  const choiceType = Object.keys(schema.complexTypes).find(
    (k) => schema.complexTypes[k]!.choice,
  )!;
  const rows = named(childRecords(schema, choiceType));
  assert.ok(rows.length && rows.every((r) => r.choiceMember && !r.mandatory));
});

test("xs:any becomes a leaf row", () =>
  assert.deepEqual(childRecords(schema, "SupplementaryDataEnvelope1"), [
    { any: true, min: 1, max: 1 },
  ]));

test("codes appear only on simple types that have them", () => {
  assert.equal("codes" in find("GroupHeader131", "MsgId"), false);
  const t = Object.entries(schema.complexTypes).flatMap(([k, c]) =>
    c.elements.flatMap((e) =>
      "tag" in e && schema.simpleTypes[e.type]?.codes ? [[k, e.tag]] : [],
    ),
  )[0]!;
  assert.ok(find(t[0]!, t[1]!).codes?.length);
});

const loop: Schema = {
  root: "Doc",
  complexTypes: {
    Top: {
      isoName: "Top",
      definition: "",
      choice: false,
      elements: [
        {
          tag: "A",
          isoName: "A",
          type: "Node",
          min: 1,
          max: 1,
          definition: "",
        },
      ],
    },
    Node: {
      isoName: "Node",
      definition: "",
      choice: false,
      elements: [
        {
          tag: "Sub",
          isoName: "Sub",
          type: "Node",
          min: 0,
          max: 1,
          definition: "",
        },
      ],
    },
  },
  simpleTypes: {},
} as unknown as Schema;

test("search index terminates on a recursive type and lists the repeat once", () => {
  assert.deepEqual(searchIndex(loop), [
    ["A", "A"],
    ["A/Sub", "Sub"],
  ]);
});

test("search index contains GrpHdr/MsgId", () =>
  assert.ok(searchIndex(schema).some(([p, n]) => p === "GrpHdr/MsgId" && n)));

test("path chain lists ancestors; unresolvable is undefined", () => {
  assert.deepEqual(
    pathChain(schema, "Document/FIToFICstmrCdtTrf/GrpHdr/MsgId"),
    ["GrpHdr", "GrpHdr/MsgId"],
  );
  assert.equal(pathChain(schema, "GrpHdr/Nope"), undefined);
});
