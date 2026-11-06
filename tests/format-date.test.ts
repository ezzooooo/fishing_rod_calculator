import assert from "node:assert/strict";
import { it } from "node:test";
import { formatDate, formatDateInput } from "../src/lib/format";

it("uses the Seoul calendar day for purchase dates across UTC midnight boundaries", () => {
  assert.equal(formatDateInput("2026-11-05T15:00:00.000Z"), "2026-11-06");
  assert.equal(formatDate("2026-11-05T15:00:00.000Z"), "2026.11.06");
  assert.equal(formatDateInput("2026-11-06T14:59:59.000Z"), "2026-11-06");
  assert.equal(formatDate("2026-11-06"), "2026.11.06");
});

it("does not present an invalid purchase date as a real calendar day", () => {
  assert.equal(formatDate(null), "—");
  assert.equal(formatDate("invalid"), "—");
  assert.throws(() => formatDateInput("invalid"), RangeError);
});
