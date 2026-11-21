import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Schema } from "../../scripts/schema-model.ts";
import { childrenOf, resolvePath, rootTypeName } from "./resolver.ts";

const schema: Schema = JSON.parse(
  readFileSync(
    new URL("../data/schema/pacs.008.001.14.json", import.meta.url),
    "utf8",
  ),
);

test("root type is the message type", () =>
  assert.equal(rootTypeName(schema), "FIToFICustomerCreditTransferV14"));

test("simple element by path", () => {
  const r = resolvePath(schema, "GrpHdr/MsgId");
  assert.equal(r?.kind, "simple");
  assert.equal(r?.typeName, "Max35Text");
  assert.equal(r?.mandatory, true);
  assert.equal(r?.repeating, false);
  assert.ok(r?.definition);
});

test("Document/<root> prefix is optional", () =>
  assert.equal(
    resolvePath(schema, `Document/${schema.root}/GrpHdr/MsgId`)?.path,
    "GrpHdr/MsgId",
  ));

test("complex element falls back to its type; repeating, optional", () => {
  const r = resolvePath(schema, "SplmtryData");
  assert.equal(r?.kind, "complex");
  assert.equal(r?.typeName, "SupplementaryData1");
  assert.equal(r?.mandatory, false);
  assert.equal(r?.repeating, true);
  assert.deepEqual(
    childrenOf(schema, r!.typeName).map((e) => "tag" in e && e.tag),
    ["PlcAndNm", "Envlp"],
  );
});

test("choice elements are flagged", () => {
  const id = resolvePath(schema, "CdtTrfTxInf/DbtrAcct/Id");
  assert.equal(id?.typeName, "AccountIdentification4Choice");
  assert.equal(id?.choice, true);
  assert.equal(id?.choiceMember, false);
  const iban = resolvePath(schema, "CdtTrfTxInf/DbtrAcct/Id/IBAN");
  assert.equal(iban?.choiceMember, true);
  assert.equal(iban?.choice, false);
});

test("xs:any is not addressable by path but visible in children", () => {
  assert.equal(resolvePath(schema, "SplmtryData/Envlp/Anything"), undefined);
  const kids = childrenOf(schema, "SupplementaryDataEnvelope1");
  assert.ok(kids.some((e) => "any" in e));
  assert.equal(
    resolvePath(schema, "SplmtryData/Envlp")?.typeName,
    "SupplementaryDataEnvelope1",
  );
});

test("unresolved paths return undefined", () => {
  for (const p of ["", "Nope", "GrpHdr/Nope", "GrpHdr/MsgId/Deeper"])
    assert.equal(resolvePath(schema, p), undefined, p);
});

test("codes in both shapes", () => {
  const coded = resolvePath(schema, "CdtTrfTxInf/ChrgBr");
  assert.equal(coded?.kind, "simple");
  assert.equal(typeof coded?.codes?.[0], "object");
  // No type in this message has plain-string codes, so use a synthetic one.
  const plain: Schema = {
    ...schema,
    simpleTypes: {
      ...schema.simpleTypes,
      Max35Text: { base: "xs:string", codes: ["A", "B"] },
    },
  };
  assert.deepEqual(resolvePath(plain, "GrpHdr/MsgId")?.codes, ["A", "B"]);
});
