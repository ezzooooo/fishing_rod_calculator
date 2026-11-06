import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateSteppedRodPrices } from "../src/lib/rod-pricing";

describe("rod prices from a selected reference length", () => {
  it("subtracts below and adds above the reference by selected order rather than numeric length gaps", () => {
    assert.deepEqual(generateSteppedRodPrices([80, 15, 30], 30, 2000, 500), {
      15: 1500, 30: 2000, 80: 2500,
    });
  });

  it("deduplicates selected lengths without mutating input or sharing generated price maps", () => {
    const lengths = Object.freeze([40, 20, 30, 20]);
    const prices = generateSteppedRodPrices(lengths, 30, 5000, 1000);
    assert.deepEqual(prices, { 20: 4000, 30: 5000, 40: 6000 });
    assert.deepEqual(lengths, [40, 20, 30, 20]);
    prices[20] = 99;
    assert.equal(generateSteppedRodPrices(lengths, 30, 5000, 1000)[20], 4000);
  });

  it("floors negative generated prices at zero and preserves a real zero reference", () => {
    assert.deepEqual(generateSteppedRodPrices([15, 20, 30, 80], 30, 1000, 1000), {
      15: 0, 20: 0, 30: 1000, 80: 2000,
    });
    assert.deepEqual(generateSteppedRodPrices([1, 200], 1, 0, 500), { 1: 0, 200: 500 });
  });

  it("supports one selected length and a zero difference for uniform prices", () => {
    assert.deepEqual(generateSteppedRodPrices([32], 32, 5000, 9000), { 32: 5000 });
    assert.deepEqual(generateSteppedRodPrices([1, 32, 200], 32, 1234, 0), {
      1: 1234, 32: 1234, 200: 1234,
    });
  });

  it("preserves decimal catalogue amounts without applying quote-time thousand-won rounding", () => {
    assert.deepEqual(generateSteppedRodPrices([20, 30, 40], 30, 1234.5, 100.25), {
      20: 1134.25, 30: 1234.5, 40: 1334.75,
    });
  });

  it("requires valid selected integer lengths and a reference within the selection", () => {
    assert.throws(() => generateSteppedRodPrices([], 32, 1000, 100), /먼저 선택/);
    for (const invalid of [0, 201, 32.5, Number.NaN, Infinity, -Infinity]) {
      assert.throws(() => generateSteppedRodPrices([32, invalid], 32, 1000, 100), /1~200의 정수/);
    }
    for (const reference of [30, 32.5, Number.NaN, Infinity]) {
      assert.throws(() => generateSteppedRodPrices([32, 34], reference, 1000, 100), /기준 칸수/);
    }
  });

  it("rejects negative or nonfinite reference amounts and differences", () => {
    for (const invalid of [-1, Number.NaN, Infinity, -Infinity]) {
      assert.throws(() => generateSteppedRodPrices([32], 32, invalid, 100), /기준 금액/);
      assert.throws(() => generateSteppedRodPrices([32], 32, 1000, invalid), /가격 차이/);
    }
  });

  it("rejects arithmetic overflow even on lower lengths rather than silently treating it as zero", () => {
    assert.throws(() => generateSteppedRodPrices([20, 30], 20, Number.MAX_VALUE, Number.MAX_VALUE), /금액 범위/);
    assert.throws(() => generateSteppedRodPrices([20, 30, 40], 40, 0, Number.MAX_VALUE), /금액 범위/);
    assert.deepEqual(generateSteppedRodPrices([20, 30], 30, Number.MAX_VALUE, Number.MAX_VALUE), {
      20: 0, 30: Number.MAX_VALUE,
    });
  });
});
