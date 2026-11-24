// Synthetic schemas, hand-written.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Schema } from "./schema-model.ts";
import { diffSchemas } from "./schema-diff.ts";

type El = Schema["complexTypes"][string]["elements"][number];
const el = (tag: string, type: string, extra: Partial<El> = {}): El =>
  ({
    tag,
    isoName: tag,
    type,
    min: 1,
    max: 1,
    definition: `def ${tag}`,
    ...extra,
  }) as El;
const ct = (...elements: El[]) => ({
  isoName: "X",
  definition: "d",
  elements,
  choice: false,
});
const make = (over: Partial<Schema["complexTypes"]> = {}, codes = ["A"]) =>
  ({
    id: "t",
    root: "Root",
    constraints: [{ name: "R1", definition: "rule" }],
    complexTypes: {
      Root: ct(el("Hdr", "Hdr"), el("Tx", "Party")),
      Hdr: ct(el("Id", "Text"), el("Pty", "Party")),
      Party: ct(el("Nm", "Text")),
      ...over,
    },
    simpleTypes: { Text: { base: "string" }, Code: { base: "string", codes } },
  }) as Schema;

test("identical schemas give empty results", () => {
  const d = diffSchemas(make(), make());
  assert.deepEqual(
    [d.added, d.removed, d.changed, d.types.changed, d.constraints.changed],
    [[], [], [], [], []],
  );
});

test("added and removed element", () => {
  const more = make({
    Hdr: ct(el("Id", "Text"), el("Pty", "Party"), el("N", "Text")),
  });
  assert.deepEqual(diffSchemas(make(), more).added, ["Root/Hdr/N"]);
  assert.deepEqual(diffSchemas(more, make()).removed, ["Root/Hdr/N"]);
});

test("changed max and definition", () => {
  const n = make({
    Hdr: ct(
      el("Id", "Text", { max: "unbounded", definition: "new" }),
      el("Pty", "Party"),
    ),
  });
  assert.deepEqual(diffSchemas(make(), n).changed, [
    { path: "Root/Hdr/Id", field: "max", old: 1, new: "unbounded" },
    { path: "Root/Hdr/Id", field: "definition", old: "def Id", new: "new" },
  ]);
});

test("element added in a shared type appears under every path", () => {
  const n = make({ Party: ct(el("Nm", "Text"), el("Adr", "Text")) });
  assert.deepEqual(diffSchemas(make(), n).added, [
    "Root/Hdr/Pty/Adr",
    "Root/Tx/Adr",
  ]);
});

test("code added to a simple type; constraint changed", () => {
  const n = make({}, ["A", "B"]);
  n.constraints = [{ name: "R1", definition: "other" }];
  const d = diffSchemas(make(), n);
  assert.deepEqual(d.types.changed, ["Code: code added B"]);
  assert.deepEqual(d.constraints.changed, ["R1"]);
});

test("any element is pathed as #any; self-containing type does not loop", () => {
  const s = make({
    Hdr: ct(el("Id", "Text"), el("Pty", "Party"), {
      any: true,
      min: 0,
      max: 1,
    }),
    Party: ct(el("Nm", "Text"), el("Sub", "Party")),
  });
  const d = diffSchemas(make(), s);
  assert.ok(d.added.includes("Root/Hdr/#any"));
  assert.ok(d.added.includes("Root/Hdr/Pty/Sub"));
  assert.ok(!d.added.some((p) => p.includes("Sub/Sub")));
});
