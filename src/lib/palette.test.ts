import { test } from "node:test";
import assert from "node:assert/strict";
import {
  elementResults,
  excerptParts,
  pageResults,
  shouldOpen,
  splitName,
  status,
  type PaletteTarget,
} from "./palette.ts";

const key = (
  target: PaletteTarget,
  o: Partial<Parameters<typeof shouldOpen>[0]> = {},
) => shouldOpen({ ctrlKey: true, metaKey: false, key: "k", target, ...o });
const field = (tagName: string, inPalette = false): PaletteTarget => ({
  tagName,
  closest: (s) => (inPalette && s === "[data-palette]" ? {} : null),
});

test("opens from the body and a button", () => {
  assert.equal(key({ tagName: "BODY" }), true);
  assert.equal(key({ tagName: "BUTTON" }), true);
  assert.equal(key(null), true);
});

test("does not open from input, textarea, select or contenteditable", () => {
  for (const tag of ["INPUT", "TEXTAREA", "SELECT"])
    assert.equal(key(field(tag)), false, tag);
  assert.equal(key({ tagName: "DIV", isContentEditable: true }), false);
});

test("Shift or Alt held keeps the browser's own shortcut", () => {
  assert.equal(key(null, { shiftKey: true }), false);
  assert.equal(key(null, { altKey: true }), false);
  assert.equal(
    key(null, { ctrlKey: false, metaKey: true, shiftKey: true }),
    false,
  );
  assert.equal(key(null, { shiftKey: false, altKey: false }), true);
});

test("non-element targets and lowercase tag names", () => {
  assert.equal(key({}), true); // document or a text node: no tagName, no closest
  assert.equal(key({ tagName: "input" }), false);
  assert.equal(key({ tagName: "textarea" }), false);
  assert.equal(key({ tagName: "button" }), true);
});

test("a contenteditable inside the palette still opens", () => {
  assert.equal(
    key({ tagName: "DIV", isContentEditable: true, closest: () => ({}) }),
    true,
  );
});

test("opens from the palette's own input", () => {
  assert.equal(key(field("INPUT", true)), true);
});

test("Ctrl and Cmd both open; other keys and no modifier do not", () => {
  assert.equal(key(null, { ctrlKey: false, metaKey: true }), true);
  assert.equal(key(null, { key: "K" }), true);
  assert.equal(key(null, { key: "j" }), false);
  assert.equal(key(null, { ctrlKey: false }), false);
});

const index: [string, string][] = [
  ["Document/FIToFICstmrCdtTrf/CdtTrfTxInf/DbtrAgt", "DebtorAgent"],
  ["Document/FIToFICstmrCdtTrf/CdtTrfTxInf/CdtrAgt", "CreditorAgent"],
  ["Document/FIToFICstmrCdtTrf/CdtTrfTxInf/DbtrAgt/FinInstnId/BICFI", "BICFI"],
];

test("splitName marks the match across spaces and case", () => {
  assert.deepEqual(splitName("DebtorAgent", "debtor agent"), [
    { text: "DebtorAgent", match: true },
  ]);
  assert.deepEqual(splitName("CreditorAgent", "OR a"), [
    { text: "Credit", match: false },
    { text: "orA", match: true },
    { text: "gent", match: false },
  ]);
  assert.deepEqual(splitName("DebtorAgent", "zzz"), [
    { text: "DebtorAgent", match: false },
  ]);
});

test("a path-only match leaves the name unmarked", () => {
  const r = elementResults([{ id: "m", index }], "FinInstnId");
  assert.deepEqual(r.hits[0]?.parts, [{ text: "BICFI", match: false }]);
});

test("elementResults carries id, path, name and parts", () => {
  const r = elementResults([{ id: "m", index }], "debtor agent");
  assert.deepEqual(r.hits[0], {
    id: "m",
    path: index[0]![0],
    name: "DebtorAgent",
    parts: [{ text: "DebtorAgent", match: true }],
  });
});

test("limit trims the hits and total still counts all, across messages", () => {
  const r = elementResults(
    [
      { id: "a", index },
      { id: "b", index },
    ],
    "agent",
    3,
  );
  assert.equal(r.hits.length, 3);
  assert.equal(r.total, 4);
  assert.deepEqual(
    r.hits.map((h) => h.id),
    ["a", "a", "b"],
  );
  assert.equal(elementResults([{ id: "a", index }], "agent").hits.length, 2);
});

test("an empty or blank query gives nothing", () => {
  for (const q of ["", "   "])
    assert.deepEqual(elementResults([{ id: "m", index }], q), {
      hits: [],
      total: 0,
    });
});

test("pageResults keeps title, url, excerpt and caps at 5", () => {
  const pages = Array.from({ length: 7 }, (_, i) => ({
    url: `/p${i}/`,
    meta: i === 0 ? { title: "First" } : {},
    excerpt: `x <mark>${i}</mark>`,
  }));
  const r = pageResults(pages);
  assert.equal(r.length, 5);
  assert.deepEqual(r[0], {
    title: "First",
    url: "/p0/",
    excerpt: "x <mark>0</mark>",
  });
  assert.equal(r[1]?.title, "/p1/");
});

test("status picks the wording key", () => {
  assert.deepEqual(status(0, 0), { key: "palette.none", n: 0, shown: 0 });
  assert.equal(status(1, 1).key, "palette.count.one");
  assert.equal(status(5, 5).key, "palette.count");
  assert.deepEqual(status(12, 8), { key: "palette.showing", n: 12, shown: 8 });
  assert.equal(status(0, 0, "loading").key, "palette.loading");
  assert.equal(status(3, 3, "error").key, "palette.error");
});

test("regex characters in the query are plain text", () => {
  assert.deepEqual(splitName("BICFI", "."), [{ text: "BICFI", match: false }]);
  assert.deepEqual(splitName("BICFI", "("), [{ text: "BICFI", match: false }]);
  const r = elementResults([{ id: "m", index }], "/");
  assert.equal(r.total, 3);
  assert.deepEqual(r.hits[0]?.parts, [{ text: "DebtorAgent", match: false }]);
  assert.equal(elementResults([{ id: "m", index }], ".").total, 0);
});

test("only the first of repeated matches is marked", () => {
  assert.deepEqual(splitName("AgentAgent", "agent"), [
    { text: "Agent", match: true },
    { text: "Agent", match: false },
  ]);
});

test("an excerpt keeps only text and mark; other markup is dropped", () => {
  assert.deepEqual(
    excerptParts('a <mark>b</mark> <img src=x onerror="y">c &lt;i&gt; &amp; d'),
    [
      { text: "a ", match: false },
      { text: "b", match: true },
      { text: " c <i> & d", match: false },
    ],
  );
});
