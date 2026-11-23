import assert from "node:assert/strict";
import { test } from "node:test";
import { sortTerms, termsByPath, type Term } from "./glossary.ts";

const debtor: Term = {
  id: "debtor",
  term: "Debtor",
  message: "pacs.008.001.14",
  elements: ["CdtTrfTxInf/Dbtr", "CdtTrfTxInf/DbtrAcct"],
};
const uetr: Term = {
  id: "uetr",
  term: "UETR",
  message: "pacs.008.001.14",
  elements: ["CdtTrfTxInf/PmtId/UETR"],
};

test("maps each element path to its term", () => {
  const m = termsByPath([uetr, debtor], "pacs.008.001.14");
  assert.deepEqual(m["CdtTrfTxInf/DbtrAcct"], { id: "debtor", term: "Debtor" });
  assert.deepEqual(m["CdtTrfTxInf/PmtId/UETR"], { id: "uetr", term: "UETR" });
});

test("an element with no term, or another message, is absent", () => {
  const m = termsByPath(
    [debtor, { ...uetr, message: "other" }],
    "pacs.008.001.14",
  );
  assert.equal(m["GrpHdr/MsgId"], undefined);
  assert.equal(m["CdtTrfTxInf/PmtId/UETR"], undefined);
});

test("sorts by term, ignoring case, without changing the input", () => {
  const input = [
    { term: "Zeta" },
    { term: "alpha" },
    { term: "uetr" },
    { term: "Creditor" },
  ];
  assert.deepEqual(
    sortTerms(input).map((x) => x.term),
    ["alpha", "Creditor", "uetr", "Zeta"],
  );
  assert.equal(input[0]!.term, "Zeta");
});

test("a path in two terms keeps the first in sorted order", () => {
  const other: Term = {
    ...uetr,
    id: "a-first",
    term: "Alpha",
    elements: debtor.elements.slice(0, 1),
  };
  const m = termsByPath([debtor, other], "pacs.008.001.14");
  assert.deepEqual(m["CdtTrfTxInf/Dbtr"], { id: "a-first", term: "Alpha" });
});
