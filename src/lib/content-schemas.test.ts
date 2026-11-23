import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AnnotationSchema,
  FlowSchema,
  GlossarySchema,
  LessonSchema,
  MessageSchema,
  SampleSchema,
} from "./content-schemas.ts";

const message = {
  id: "pacs.008.001.14",
  family: "pacs",
  name: "X",
  purpose: "y",
  sources: [
    { title: "t", url: "https://example.org/a", retrieved: "2026-11-21" },
  ],
  lastReviewed: { date: "2026-11-21", by: "me" },
};

test("valid message passes", () =>
  assert.ok(MessageSchema.safeParse(message).success));

test("missing lastReviewed fails", () => {
  const bad = { ...message, lastReviewed: undefined };
  assert.ok(!MessageSchema.safeParse(bad).success);
});

test("bad source URL fails", () => {
  const bad = {
    ...message,
    sources: [{ ...message.sources[0], url: "not a url" }],
  };
  assert.ok(!MessageSchema.safeParse(bad).success);
});

test("annotation with empty byPath passes, localized text needs en", () => {
  assert.ok(AnnotationSchema.safeParse({ message: "m", byPath: {} }).success);
  const bad = { message: "m", byPath: { "A/B": { explanation: { pl: "x" } } } };
  assert.ok(!AnnotationSchema.safeParse(bad).success);
});

const sample = {
  id: "s",
  message: "m",
  file: "s.xml",
  title: "t",
  scenario: "x",
  order: 1,
};

test("sample needs an integer order", () => {
  assert.ok(SampleSchema.safeParse(sample).success);
  assert.ok(!SampleSchema.safeParse({ ...sample, order: undefined }).success);
  assert.ok(!SampleSchema.safeParse({ ...sample, order: 1.5 }).success);
});

const lesson = {
  title: "What is pacs.008?",
  summary: "One sentence.",
  step: "lesson",
  order: 1,
  relatedElements: ["GrpHdr/MsgId"],
  sources: [
    { title: "t", url: "https://example.org/a", retrieved: "2026-11-22" },
  ],
  lastReviewed: { date: "2026-11-22", by: "unreviewed" },
};

test("valid lesson passes, relatedElements defaults to empty", () => {
  assert.ok(LessonSchema.safeParse(lesson).success);
  const r = LessonSchema.safeParse({ ...lesson, relatedElements: undefined });
  assert.deepEqual(r.data?.relatedElements, []);
});

test("lesson without sources, with an unknown step, an http url or an extra key fails", () => {
  const bad = (o: object) =>
    !LessonSchema.safeParse({ ...lesson, ...o }).success;
  assert.ok(bad({ sources: [] }));
  assert.ok(bad({ sources: undefined }));
  assert.ok(bad({ step: "video" }));
  assert.ok(bad({ order: 7 }));
  assert.ok(
    bad({ sources: [{ ...lesson.sources[0], url: "http://example.org/a" }] }),
  );
  assert.ok(bad({ extra: 1 }));
});

const step = (from: string, to: string) => ({
  from,
  to,
  title: "t",
  text: "x",
});
const flow = () => ({
  id: "f",
  message: "m",
  title: "t",
  summary: "s",
  lesson: "l",
  sample: "s",
  sources: [
    { title: "t", url: "https://example.org/a", retrieved: "2026-11-22" },
  ],
  lastReviewed: { date: "2026-11-22", by: "me" },
  participants: [
    { id: "a", role: "A", who: "x" },
    { id: "b", role: "B", who: "y" },
  ],
  variants: [
    {
      id: "serial",
      title: "t",
      intro: "i",
      steps: [step("a", "b"), step("b", "a")],
    },
  ],
});

test("good flow passes and elements default to empty", () => {
  const r = FlowSchema.safeParse(flow());
  assert.ok(r.success);
  assert.deepEqual(r.data.variants[0]!.steps[0]!.elements, []);
});

test("flow without variants fails", () => {
  assert.ok(!FlowSchema.safeParse({ ...flow(), variants: undefined }).success);
});

test("flow with an unknown variant id fails", () => {
  const f = flow();
  f.variants[0]!.id = "parallel";
  assert.ok(!FlowSchema.safeParse(f).success);
});

test("flow with a non-https source fails", () => {
  const f = flow();
  f.sources[0]!.url = "http://example.org/a";
  assert.ok(!FlowSchema.safeParse(f).success);
});

test("flow with an extra key fails", () => {
  assert.ok(!FlowSchema.safeParse({ ...flow(), extra: 1 }).success);
});

test("flow needs two participants and a variant with two steps", () => {
  const one = flow();
  one.participants.pop();
  assert.ok(!FlowSchema.safeParse(one).success);
  const short = flow();
  short.variants[0]!.steps.pop();
  assert.ok(!FlowSchema.safeParse(short).success);
});

test("flow sample is optional and a step may flag sample: true only", () => {
  const f = flow();
  assert.ok(FlowSchema.safeParse({ ...f, sample: undefined }).success);
  const ok = flow();
  Object.assign(ok.variants[0]!.steps[0]!, { sample: true });
  assert.ok(FlowSchema.safeParse(ok).success);
  const bad = flow();
  Object.assign(bad.variants[0]!.steps[0]!, { sample: false });
  assert.ok(!FlowSchema.safeParse(bad).success);
});

const term = () => ({
  id: "debtor",
  term: "Debtor",
  plain: "The payer.",
  message: "pacs.008.001.14",
  elements: ["CdtTrfTxInf/Dbtr"],
  lastReviewed: { date: "2026-11-23", by: "me" },
});

test("good glossary term passes and related defaults to empty", () => {
  const r = GlossarySchema.safeParse(term());
  assert.ok(r.success);
  assert.deepEqual(r.data.related, []);
  assert.equal(r.data.lesson, undefined);
});

test("glossary term with an extra key fails", () => {
  assert.ok(!GlossarySchema.safeParse({ ...term(), extra: 1 }).success);
});

test("glossary term needs at least one element", () => {
  assert.ok(!GlossarySchema.safeParse({ ...term(), elements: [] }).success);
});
