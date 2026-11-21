import { test } from "node:test";
import assert from "node:assert/strict";
import { AnnotationSchema, MessageSchema } from "./content-schemas.ts";

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
