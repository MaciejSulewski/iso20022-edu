import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Schema } from "./schema-model.ts";
import { STEPS } from "../src/lib/content-schemas.ts";
import { checkContent, sharedTypes, type Input } from "./check-content.ts";

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
      data: {
        id: "s",
        message: id,
        file: "s.xml",
        title: "t",
        scenario: "s",
        order: 1,
      },
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

test("sharedTypes counts types used by two or more elements and those overlaid", () => {
  const el = (type: string) => ({ tag: "x", type });
  const s = {
    complexTypes: {
      A: { elements: [el("B"), el("B"), el("C")] },
      B: { elements: [el("C"), el("Max35Text")] },
      C: { elements: [] },
    },
  } as unknown as Schema;
  // B is used twice, C twice, Max35Text is not a complex type.
  assert.deepEqual(sharedTypes(s, new Set(["B", "Z"])), {
    overlaid: 1,
    total: 2,
  });
});

test("two samples of one message with the same order fail", () => {
  const i = base();
  const copy = structuredClone(sample(i));
  (copy.data as { id: string }).id = "t";
  copy.name = "t.yaml";
  i.samples.push(copy);
  assert.match(errs(i), /same order 1/);
  (copy.data as { order: number }).order = 2;
  assert.doesNotMatch(errs(i), /same order/);
});

const lessonFile = (name: string, step: string, order: number) => ({
  name,
  data: {
    title: "T",
    summary: "S",
    step,
    order,
    relatedElements: ["GrpHdr/MsgId"],
    sources: [
      { title: "t", url: "https://example.com", retrieved: "2026-11-22" },
    ],
    lastReviewed: { date: "2026-11-22", by: "u" },
  },
});
const withLessons = (...l: ReturnType<typeof lessonFile>[]) => ({
  ...base(),
  lessons: l,
});

test("clean lessons pass and are counted", () => {
  const r = checkContent(withLessons(lessonFile("a.md", "lesson", 1)));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.lessons, { count: 1, missingSteps: STEPS.slice(1) });
});

test("lesson with bad front matter fails", () => {
  const l = lessonFile("a.md", "lesson", 1);
  (l.data as { sources: unknown[] }).sources = [];
  assert.match(errs(withLessons(l)), /a\.md/);
});

test("two lessons for one step count as one step", () => {
  const i = withLessons(
    lessonFile("a.md", "lesson", 1),
    lessonFile("b.md", "lesson", 2),
  );
  assert.match(errs(i), /b\.md: step "lesson" is already used by a\.md/);
  assert.equal(checkContent(i).lessons.count, 1);
});

test("two lessons with one order fail", () => {
  const i = withLessons(
    lessonFile("a.md", "lesson", 1),
    lessonFile("b.md", "xml", 1),
  );
  assert.match(errs(i), /b\.md: order 1 is already used by a\.md/);
});

test("order must equal the step position", () => {
  const i = withLessons(lessonFile("a.md", "xml", 3));
  assert.match(errs(i), /a\.md: order 3 .* step "xml" is position 2/);
});

test("related element that does not resolve fails", () => {
  const l = lessonFile("a.md", "lesson", 1);
  l.data.relatedElements = ["GrpHdr/Nope"];
  assert.match(errs(withLessons(l)), /a\.md: relatedElements "GrpHdr\/Nope"/);
});

test("a step without a lesson is an error only when required", () => {
  const i = withLessons(lessonFile("a.md", "lesson", 1));
  assert.doesNotMatch(errs(i), /no lesson/);
  assert.match(
    errs({ ...i, requireAllSteps: true }),
    /step "xml" has no lesson/,
  );
});

const flowFile = () => ({
  name: "f.yaml",
  data: {
    id: "f",
    message: id,
    title: "T",
    summary: "S",
    lesson: "l",
    sample: "s" as string | undefined,
    sources: [
      { title: "t", url: "https://example.com", retrieved: "2026-11-22" },
    ],
    lastReviewed: { date: "2026-11-22", by: "u" },
    participants: [
      { id: "a", role: "A", who: "x" },
      { id: "b", role: "B", who: "y" },
    ],
    variants: [
      {
        id: "serial",
        title: "T",
        intro: "I",
        steps: [
          {
            from: "a",
            to: "b",
            title: "t",
            text: "x",
            elements: ["GrpHdr/MsgId"],
            settlement: "INDA",
            sample: true as boolean | undefined,
          },
          { from: "b", to: "a", title: "t", text: "x" },
        ],
      },
    ],
  },
});
type FlowData = ReturnType<typeof flowFile>["data"];
const withFlow = (edit?: (d: FlowData) => void) => {
  const f = flowFile();
  edit?.(f.data);
  return {
    ...base(),
    lessons: [lessonFile("l.md", "lesson", 1)],
    flows: [f],
  };
};

test("clean flow passes and is counted", () => {
  const r = checkContent(withFlow());
  assert.deepEqual(r.errors, []);
  assert.equal(r.flows, 1);
});

test("flow with bad data fails", () => {
  assert.match(errs(withFlow((d) => (d.variants = []))), /f\.yaml/);
});

test("flow id must match file name", () => {
  assert.match(
    errs(withFlow((d) => (d.id = "g"))),
    /f\.yaml: id "g" does not match/,
  );
});

test("flow message must have a schema", () => {
  assert.match(
    errs(withFlow((d) => (d.message = "pacs.009.001.10"))),
    /f\.yaml: no schema for message "pacs.009.001.10"/,
  );
});

test("flow element that does not resolve fails", () => {
  const i = withFlow((d) => (d.variants[0]!.steps[0]!.elements = ["Nope"]));
  assert.match(errs(i), /f\.yaml: element "Nope" does not resolve/);
});

test("flow settlement must be a SettlementMethod1Code code", () => {
  const i = withFlow((d) => (d.variants[0]!.steps[0]!.settlement = "XXXX"));
  assert.match(errs(i), /f\.yaml: settlement "XXXX" is not a code of/);
});

test("flow step from and to must be participants", () => {
  const i = withFlow((d) => (d.variants[0]!.steps[1]!.to = "z"));
  assert.match(errs(i), /f\.yaml: step 2 "to" "z" is not a participant/);
  const j = withFlow((d) => (d.variants[0]!.steps[0]!.from = "y"));
  assert.match(errs(j), /f\.yaml: step 1 "from" "y" is not a participant/);
});

test("flow participant in no step of a variant fails", () => {
  const i = withFlow((d) => {
    d.participants.push({ id: "c", role: "C", who: "z" });
  });
  assert.match(
    errs(i),
    /f\.yaml: variant "serial": participant "c" is in no step/,
  );
});

test("flow lesson and sample must exist for the message", () => {
  assert.match(
    errs(withFlow((d) => (d.lesson = "nope"))),
    /f\.yaml: lesson "nope" is not a lesson/,
  );
  assert.match(
    errs(withFlow((d) => (d.sample = "nope"))),
    /f\.yaml: sample "nope" is not a sample of/,
  );
});

test("flow variant ids must be unique", () => {
  const i = withFlow((d) => d.variants.push({ ...d.variants[0]! }));
  assert.match(errs(i), /f\.yaml: variant id "serial" is used twice/);
});

test("flow participant ids must be unique", () => {
  const i = withFlow((d) => d.participants.push({ ...d.participants[0]! }));
  assert.match(errs(i), /f\.yaml: participant id "a" is used twice/);
});

test("a flow sample needs exactly one step flagged sample: true", () => {
  const none = withFlow((d) => delete d.variants[0]!.steps[0]!.sample);
  assert.match(
    errs(none),
    /f\.yaml: sample "s" needs exactly one step with sample: true, found 0/,
  );
  const two = withFlow((d) => {
    (d.variants[0]!.steps[1]! as { sample?: boolean }).sample = true;
  });
  assert.match(errs(two), /exactly one step with sample: true, found 2/);
});

test("a step flagged sample: true needs a flow-level sample", () => {
  const i = withFlow((d) => (d.sample = undefined));
  assert.match(
    errs(i),
    /f\.yaml: a step sets sample: true but the flow has no sample/,
  );
  assert.deepEqual(
    checkContent(
      withFlow((d) => {
        d.sample = undefined;
        delete d.variants[0]!.steps[0]!.sample;
      }),
    ).errors,
    [],
  );
});

const mappingFile = () => ({
  name: "m.yaml",
  data: {
    id: "m",
    message: id,
    title: "T",
    summary: "S",
    lesson: "l",
    sources: [
      { title: "t", url: "https://example.com", retrieved: "2026-11-23" },
      { title: "u", url: "https://example.com/u", retrieved: "2026-11-23" },
    ],
    lastReviewed: { date: "2026-11-23", by: "u" },
    rows: [
      {
        field: "20",
        paths: ["GrpHdr/MsgId"],
        sources: [0],
      },
      {
        field: "71a",
        paths: ["CdtTrfTxInf/ChrgBr"],
        codeList: "ChargeBearerType1Code" as string | undefined,
        codes: [{ mt: "BEN", iso: "CRED" }] as { mt: string; iso: string }[],
        sources: [0],
      },
    ],
    additions: [{ paths: ["GrpHdr/NbOfTxs"], note: "n", sources: [1] }],
  },
});
type MappingData = ReturnType<typeof mappingFile>["data"];
const withMapping = (edit?: (d: MappingData) => void) => {
  const f = mappingFile();
  edit?.(f.data);
  return {
    ...base(),
    lessons: [lessonFile("l.md", "lesson", 1)],
    mappings: [f],
  };
};

test("clean mapping passes and is counted", () => {
  const r = checkContent(withMapping());
  assert.deepEqual(r.errors, []);
  assert.equal(r.mappings, 1);
});

test("mapping with bad data fails", () => {
  assert.match(errs(withMapping((d) => (d.rows[0]!.paths = []))), /m\.yaml/);
});

test("mapping id must match file name", () => {
  assert.match(
    errs(withMapping((d) => (d.id = "g"))),
    /m\.yaml: id "g" does not match/,
  );
});

test("mapping message must have a schema", () => {
  assert.match(
    errs(withMapping((d) => (d.message = "pacs.009.001.10"))),
    /m\.yaml: no schema for message "pacs.009.001.10"/,
  );
});

test("mapping lesson must exist", () => {
  assert.match(
    errs(withMapping((d) => (d.lesson = "nope"))),
    /m\.yaml: lesson "nope" is not a lesson/,
  );
});

test("mapping path that does not resolve fails in rows and additions", () => {
  assert.match(
    errs(withMapping((d) => (d.rows[0]!.paths = ["Nope"]))),
    /m\.yaml: row "20": path "Nope" does not resolve/,
  );
  assert.match(
    errs(withMapping((d) => (d.additions[0]!.paths = ["Nope"]))),
    /m\.yaml: addition 1: path "Nope" does not resolve/,
  );
});

test("mapping path used twice, within or across tables, fails", () => {
  const across = withMapping((d) => (d.additions[0]!.paths = ["GrpHdr/MsgId"]));
  assert.match(errs(across), /m\.yaml: path "GrpHdr\/MsgId" appears twice/);
  const within = withMapping((d) => d.rows[0]!.paths.push("GrpHdr/MsgId"));
  assert.match(errs(within), /path "GrpHdr\/MsgId" appears twice/);
});

test("mapping field used twice fails", () => {
  const i = withMapping((d) => (d.rows[1]!.field = "20"));
  assert.match(errs(i), /m\.yaml: field "20" appears twice/);
});

test("mapping code must be a code of the code list", () => {
  const i = withMapping((d) => (d.rows[1]!.codes![0]!.iso = "CREDX"));
  assert.match(errs(i), /m\.yaml: row "71a": "CREDX" is not a code of Charge/);
});

test("mapping codes need a known code list", () => {
  assert.match(
    errs(withMapping((d) => (d.rows[1]!.codeList = undefined))),
    /m\.yaml: row "71a": codeList "" is not a simple type with codes/,
  );
  assert.match(
    errs(withMapping((d) => (d.rows[1]!.codeList = "Nope"))),
    /codeList "Nope" is not a simple type/,
  );
});

test("mapping source index must be in the sources list", () => {
  const i = withMapping((d) => (d.rows[0]!.sources = [5]));
  assert.match(errs(i), /m\.yaml: row "20": source 5 is not in the sources/);
});

test("mapping codeList without codes must still be a known simple type", () => {
  const i = withMapping((d) => {
    delete d.rows[1]!.codes;
    d.rows[1]!.codeList = "Nope";
  });
  assert.match(errs(i), /row "71a": codeList "Nope" is not a simple type/);
});

test("mapping paths that resolve to the same element count as duplicates", () => {
  const i = withMapping(
    (d) => (d.additions[0]!.paths = ["FIToFICstmrCdtTrf/GrpHdr/MsgId"]),
  );
  assert.match(errs(i), /appears twice/);
});

test("every mapping source must be used", () => {
  const i = withMapping((d) => (d.additions[0]!.sources = [0]));
  assert.match(errs(i), /m\.yaml: source 1 "u" is used by no row or addition/);
});

const termFile = (n: string, term: string, el: string) => ({
  name: `${n}.yaml`,
  data: {
    id: n,
    term,
    plain: "p",
    message: id,
    elements: [el],
    related: [] as string[],
    lesson: "l" as string | undefined,
    lastReviewed: { date: "2026-11-23", by: "u" },
  },
});
type TermFile = ReturnType<typeof termFile>;
const withGlossary = (edit?: (a: TermFile, b: TermFile) => void) => {
  const a = termFile("a", "Alpha", "GrpHdr/MsgId");
  const b = termFile("b", "Beta", "CdtTrfTxInf/ChrgBr");
  edit?.(a, b);
  return {
    ...base(),
    lessons: [lessonFile("l.md", "lesson", 1)],
    glossary: [a, b],
  };
};

test("clean glossary passes and is counted", () => {
  const r = checkContent(withGlossary());
  assert.deepEqual(r.errors, []);
  assert.equal(r.glossary, 2);
});

test("glossary term with bad data fails", () => {
  assert.match(errs(withGlossary((a) => (a.data.elements = []))), /a\.yaml/);
});

test("glossary id must match file name", () => {
  assert.match(
    errs(withGlossary((a) => (a.data.id = "g"))),
    /a\.yaml: id "g" does not match/,
  );
});

test("glossary message must have a schema", () => {
  assert.match(
    errs(withGlossary((a) => (a.data.message = "pacs.009.001.10"))),
    /a\.yaml: no schema for message "pacs.009.001.10"/,
  );
});

test("glossary element that does not resolve fails", () => {
  assert.match(
    errs(withGlossary((a) => (a.data.elements = ["Nope"]))),
    /a\.yaml: element "Nope" does not resolve/,
  );
});

test("glossary related must exist, not be the term, and appear once", () => {
  assert.match(
    errs(withGlossary((a) => (a.data.related = ["zzz"]))),
    /a\.yaml: related "zzz" is not a term id/,
  );
  assert.match(
    errs(withGlossary((a) => (a.data.related = ["a"]))),
    /a\.yaml: related "a" is the term itself/,
  );
  assert.match(
    errs(withGlossary((a) => (a.data.related = ["b", "b"]))),
    /a\.yaml: related "b" appears twice/,
  );
});

test("glossary lesson must exist when given", () => {
  assert.match(
    errs(withGlossary((a) => (a.data.lesson = "nope"))),
    /a\.yaml: lesson "nope" is not a lesson/,
  );
  assert.deepEqual(
    checkContent(withGlossary((a) => (a.data.lesson = undefined))).errors,
    [],
  );
});

test("glossary terms must differ, ignoring case", () => {
  assert.match(
    errs(withGlossary((_, b) => (b.data.term = "ALPHA"))),
    /b\.yaml: term "ALPHA" is already used by a\.yaml/,
  );
});

test("glossary elements are claimed once, even through another spelling", () => {
  assert.match(
    errs(withGlossary((_, b) => (b.data.elements = ["GrpHdr/MsgId"]))),
    /b\.yaml: element "GrpHdr\/MsgId" is already claimed by a\.yaml/,
  );
  const spelled = withGlossary(
    (_, b) => (b.data.elements = ["FIToFICstmrCdtTrf/GrpHdr/MsgId"]),
  );
  assert.match(errs(spelled), /already claimed by a\.yaml/);
});
