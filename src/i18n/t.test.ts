import { test } from "node:test";
import assert from "node:assert/strict";
import { t, type UiKey } from "./t.ts";

test("t returns the English string", () => {
  assert.equal(t("site.title"), "ISO 20022 Edu");
});

test("t throws on a missing key", () => {
  assert.throws(() => t("nope" as UiKey), /Missing i18n key: nope/);
});
