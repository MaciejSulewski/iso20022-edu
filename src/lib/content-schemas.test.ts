import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AnnotationSchema,
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
