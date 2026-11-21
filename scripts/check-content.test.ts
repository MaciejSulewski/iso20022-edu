import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Schema } from "./schema-model.ts";
import { checkContent, type Input } from "./check-content.ts";

const schema: Schema = JSON.parse(
  readFileSync(
    new URL("../src/data/schema/pacs.008.001.14.json", import.meta.url),
    "utf8",
  ),
);
const id = "pacs.008.001.14";
const loc = { en: "x" };
const base = (): Input => ({
  schema,
  messages: [
    {
      name: `${id}.yaml`,
      data: {
        id,
        family: "pacs",
        name: "n",
        purpose: "p",
        sources: [
          { title: "t", url: "https://example.com", retrieved: "2026-01-01" },
        ],
        lastReviewed: { date: "2026-01-01", by: "me" },
      },
    },
  ],
  annotations: [
    {
      name: `${id}.yaml`,
      data: { message: id, byPath: { "GrpHdr/MsgId": { explanation: loc } } },
    },
  ],
  samples: [
    {
      name: "s.yaml",
      data: { id: "s", message: id, file: "s.xml", title: "t", scenario: "s" },
      xml: `<Document><${schema.root}><GrpHdr><MsgId>1</MsgId><NbOfTxs>1</NbOfTxs></GrpHdr></${schema.root}></Document>`,
    },
  ],
});

test("clean content passes and coverage counts annotated paths", () => {
  const r = checkContent(base());
  assert.deepEqual(r.errors, []);
  // GrpHdr, MsgId, NbOfTxs: only MsgId is annotated.
  assert.deepEqual(r.coverage, { annotated: 1, total: 3 });
});

test("dead byPath key fails", () => {
  const i = base();
  (i.annotations[0]!.data as { byPath: object }).byPath = {
    "GrpHdr/Nope": { explanation: loc },
  };
  assert.match(checkContent(i).errors.join(), /byPath "GrpHdr\/Nope"/);
});

test("unresolved sample element fails", () => {
  const i = base();
  i.samples[0]!.xml = `<Document><${schema.root}><Bogus/></${schema.root}></Document>`;
  assert.match(checkContent(i).errors.join(), /element "Bogus"/);
});

test("unknown message id fails", () => {
  const i = base();
  (i.samples[0]!.data as { message: string }).message = "pacs.999";
  assert.match(
    checkContent(i).errors.join(),
    /"pacs.999" is not a known message id/,
  );
});

const errs = (i: Input) => checkContent(i).errors.join("\n");
const sample = (i: Input) => i.samples[0]!;
const anno = (i: Input) => i.annotations[0]!.data as Record<string, unknown>;
const withOther = (i: Input) => {
  i.messages.push({
    name: "pacs.009.001.10.yaml",
    data: { ...(i.messages[0]!.data as object), id: "pacs.009.001.10" },
  });
  return i;
};

test("wrong sample root fails instead of passing with 0 of 0", () => {
  const i = base();
  sample(i).xml = `<Document><Other><GrpHdr/></Other></Document>`;
  assert.match(errs(i), /s\.xml: expected root Document\/FIToFICstmrCdtTrf/);
  sample(i).xml = "";
  assert.match(errs(i), /expected root/);
});

test("sample for a message with no loaded schema fails", () => {
  const i = withOther(base());
  (sample(i).data as { message: string }).message = "pacs.009.001.10";
  assert.match(errs(i), /s\.yaml: no schema for message "pacs.009.001.10"/);
});

test("annotation for a message with no loaded schema fails", () => {
  const i = withOther(base());
  anno(i).message = "pacs.009.001.10";
  assert.match(errs(i), /no schema for message "pacs.009.001.10"/);
});

test("bad byType fails", () => {
  const i = base();
  anno(i).byType = {
    Max35Text: { explanation: loc },
    Nope: { explanation: loc },
  };
  assert.match(errs(i), /byType "Max35Text" is not a complex type/);
  assert.match(errs(i), /byType "Nope"/);
});

test("bad codes type and bad code fail", () => {
  const i = base();
  anno(i).codes = {
    Max35Text: { X: loc },
    AddressType2Code: { ADDR: loc, ZZZZ: loc },
  };
  const e = errs(i);
  assert.match(e, /codes "Max35Text" is not a simple type with codes/);
  assert.match(e, /codes "AddressType2Code" has no code "ZZZZ"/);
  assert.doesNotMatch(e, /no code "ADDR"/);
});

test("missing sample xml fails", () => {
  const i = base();
  delete sample(i).xml;
  assert.match(errs(i), /file "s\.xml" does not exist/);
});

test("id must match file name", () => {
  const i = base();
  sample(i).name = "other.yaml";
  assert.match(errs(i), /other\.yaml: id "s" does not match the file name/);
});

test("repeated siblings count once", () => {
  const i = base();
  sample(i).xml =
    `<Document><${schema.root}><GrpHdr><MsgId>1</MsgId></GrpHdr><CdtTrfTxInf><PmtId/></CdtTrfTxInf><CdtTrfTxInf><PmtId/></CdtTrfTxInf></${schema.root}></Document>`;
  const r = checkContent(i);
  assert.deepEqual(r.errors, []);
  assert.equal(r.coverage.total, 4);
});
