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
