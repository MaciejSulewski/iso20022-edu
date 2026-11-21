import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Schema } from "../../scripts/schema-model.ts";
import { buildTree, elementPaths, parseXml, type XmlNode } from "./xml-tree.ts";

const schema: Schema = JSON.parse(
  readFileSync(
    new URL("../data/schema/pacs.008.001.14.json", import.meta.url),
    "utf8",
  ),
);
const wrap = (body: string) =>
  `<?xml version="1.0"?><!-- c --><Document xmlns="urn:x"><${schema.root}>${body}</${schema.root}></Document>`;
const find = (nodes: XmlNode[], path: string): XmlNode | undefined =>
  nodes.flatMap((n) => [n, ...n.children]).find((n) => n.path === path);

const sample = wrap(
  `<GrpHdr><MsgId>M1</MsgId><NbOfTxs>1</NbOfTxs></GrpHdr>
   <CdtTrfTxInf><IntrBkSttlmAmt Ccy="EUR">1.00</IntrBkSttlmAmt><ChrgBr>SHAR</ChrgBr></CdtTrfTxInf>
   <CdtTrfTxInf><ChrgBr>DEBT</ChrgBr></CdtTrfTxInf>`,
);

test("paths, values, order and info", () => {
  const tree = buildTree(sample, schema);
  assert.deepEqual(
    tree.map((n) => n.tag),
    ["GrpHdr", "CdtTrfTxInf", "CdtTrfTxInf"],
  );
  const id = find(tree, "GrpHdr/MsgId")!;
  assert.equal(id.value, "M1");
  assert.equal(id.info.typeName, "Max35Text");
  assert.equal(id.info.mandatory, true);
  assert.ok(id.info.definition);
  assert.deepEqual(id.children, []);
});

test("repeated siblings share a path and get a 1-based index", () => {
  const tree = buildTree(sample, schema);
  assert.deepEqual(
    tree.map((n) => [n.path, n.repeatIndex]),
    [
      ["GrpHdr", undefined],
      ["CdtTrfTxInf", 1],
      ["CdtTrfTxInf", 2],
    ],
  );
});

test("attributes are kept without the prefix", () =>
  assert.deepEqual(
    find(buildTree(sample, schema), "CdtTrfTxInf/IntrBkSttlmAmt")?.attrs,
    { Ccy: "EUR" },
  ));

test("code shapes are normalised to objects", () => {
  const codes = find(buildTree(sample, schema), "CdtTrfTxInf/ChrgBr")!.info
    .codes!;
  assert.ok(codes.length > 0);
  for (const c of codes) assert.equal(typeof c.code, "string");
});

test("overlay: byPath wins over byType; text resolved to en", () => {
  const o = (explanation: string) => ({ explanation: { en: explanation } });
  const tree = buildTree(sample, schema, {
    byPath: {
      "GrpHdr/MsgId": { ...o("path"), notes: { en: "n" }, examples: ["x"] },
    },
    byType: { Max35Text: o("type") },
  });
  const id = find(tree, "GrpHdr/MsgId")!.info;
  assert.equal(id.explanation, "path");
  assert.equal(id.notes, "n");
  assert.deepEqual(id.examples, ["x"]);
  assert.equal(find(tree, "GrpHdr")!.info.explanation, undefined);
  const viaType = buildTree(wrap("<GrpHdr><MsgId>a</MsgId></GrpHdr>"), schema, {
    byPath: {},
    byType: { Max35Text: o("type") },
  });
  assert.equal(viaType[0]!.children[0]!.info.explanation, "type");
});

test("unresolved element throws with its path", () =>
  assert.throws(
    () => buildTree(wrap("<GrpHdr><Nope/></GrpHdr>"), schema),
    /GrpHdr\/Nope/,
  ));

test("missing root throws", () =>
  assert.throws(() => buildTree("<Document><Other/></Document>", schema)));

test("elementPaths lists every path without indexes", () =>
  assert.deepEqual(elementPaths(parseXml(sample, schema.root)!), [
    "GrpHdr",
    "GrpHdr/MsgId",
    "GrpHdr/NbOfTxs",
    "CdtTrfTxInf",
    "CdtTrfTxInf/IntrBkSttlmAmt",
    "CdtTrfTxInf/ChrgBr",
    "CdtTrfTxInf",
    "CdtTrfTxInf/ChrgBr",
  ]));
