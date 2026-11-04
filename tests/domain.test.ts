import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adjustedUnitPrice,
  availableLengths,
  buildQuoteText,
  emptyDraft,
  groupQuoteItems,
  normalizeBrand,
  normalizeDate,
  normalizeFishingRod,
  normalizeQuoteRecord,
  priceForLength,
  quoteItemsFromDraft,
  quoteSummary,
  quoteTotals,
  removeDraftRod,
  upsertDraftRod,
  validateQuote,
  type FishingRod,
  type QuoteDraftRod,
  type QuoteItem,
  type QuoteRecord,
} from "../src/lib/domain";
import { formatAppliedRate, formatDateKey, formatDateTime, formatLengthRange, formatMoney, formatNumber } from "../src/lib/format";

function rod(id = "rod-1"): FishingRod {
  return normalizeFishingRod({
    id,
    name: id === "rod-1" ? "독야1" : "체어맨 블루",
    brandId: "brand-1",
    minValue: 18,
    maxValue: 22,
    usedPrice: 9000,
    purchaseLengthPrices: { 18: 15900, 20: 22600 },
    saleLengthPrices: { 18: 19800, 20: 30400 },
  });
}

function group(id = "rod-1", quantity = 2): QuoteDraftRod {
  return {
    rod: rod(id),
    brandName: "송원",
    calculations: [{ fishingRodId: id, length: 18, quantity, discountRate: 0.65, saleRate: 0.8 }],
  };
}

function record(): QuoteRecord {
  const items = quoteItemsFromDraft(upsertDraftRod(emptyDraft(), group()));
  return {
    id: "quote-1",
    title: "김민수님 매입 상담",
    note: "토요일 방문",
    customerName: "김민수",
    createdBy: "staff-1",
    mode: "purchase",
    items,
    createdAt: "2026-11-04T05:35:00.000Z",
    updatedAt: null,
    revision: 2,
    ...quoteTotals(items),
  };
}

function snapshotItem(changes: Partial<QuoteItem> = {}): QuoteItem {
  return {
    fishingRodId: "rod-1",
    fishingRodName: "독야1",
    brandName: "송원",
    length: 18,
    quantity: 1,
    unitPrice: 100000,
    rate: 0.5,
    finalUnitPrice: 50000,
    ...changes,
  };
}

describe("existing Firestore data compatibility", () => {
  it("accepts ISO strings, native dates and Firestore timestamps", () => {
    const expected = "2026-11-04T05:35:00.000Z";
    assert.equal(normalizeDate("2026-11-04T14:35:00+09:00"), expected);
    assert.equal(normalizeDate(new Date(expected)), expected);
    assert.equal(normalizeDate({ toDate: () => new Date(expected) }), expected);
    assert.equal(normalizeDate({ seconds: new Date(expected).getTime() / 1000, nanoseconds: 0 }), expected);
    assert.equal(normalizeDate("bad date"), null);
    assert.equal(normalizeDate(null), null);
  });

  it("uses document IDs and supports optional catalogue timestamps", () => {
    const result = normalizeBrand({ id: "incorrect", name: "송원" }, "document-id");
    assert.equal(result.id, "document-id");
    assert.equal(result.createdAt, null);
    assert.equal(result.name, "송원");
  });

  it("uses legacy maps in both modes and accepts numeric JSON price keys", () => {
    const result = normalizeFishingRod({ id: "legacy", name: "독야", lengthPrices: { "18": "12000", "20": 16000, invalid: 55 } });
    assert.deepEqual(result.purchaseLengthPrices, { "18": 12000, "20": 16000 });
    assert.deepEqual(result.saleLengthPrices, result.purchaseLengthPrices);
    assert.equal(result.usedPrice, 14000);
    assert.deepEqual(availableLengths(result), [18, 20]);
  });

  it("accepts purchasePrices/salePrices aliases and preserves distinct prices", () => {
    const result = normalizeFishingRod({ purchasePrices: { "18": 10000 }, salePrices: { "18": 20000, "22": 25000 } });
    assert.equal(priceForLength(result, 18, "purchase"), 10000);
    assert.equal(priceForLength(result, 18, "sale"), 20000);
    assert.deepEqual(availableLengths(result), [18, 22]);
    assert.equal(result.usedPrice, 22500);
  });

  it("keeps zero prices and generates legacy min/max lengths when maps are empty", () => {
    const result = normalizeFishingRod({ minValue: 18, maxValue: 24, usedPrice: 0, lengthPrices: {} });
    assert.deepEqual(availableLengths(result), [18, 20, 22, 24]);
    assert.equal(priceForLength(result, 20, "sale"), 0);
    const zero = { ...rod(), purchaseLengthPrices: { "18": 0 } };
    assert.equal(priceForLength(zero, 18, "purchase"), 0);
  });

  it("retains saved final unit prices, legacy customer defaults and pending server times", () => {
    const original = record();
    const result = normalizeQuoteRecord({
      ...original,
      customerName: undefined,
      createdAt: null,
      clientCreatedAt: { toDate: () => new Date(original.createdAt) },
      updatedAt: null,
      clientUpdatedAt: "2026-11-04T06:00:00Z",
      revision: undefined,
      totalPrice: 999,
      items: [{ ...original.items[0], finalUnitPrice: 6500 }],
    }, "server-id");
    assert.equal(result.id, "server-id");
    assert.equal(result.createdAt, original.createdAt);
    assert.equal(result.updatedAt, "2026-11-04T06:00:00.000Z");
    assert.equal(result.customerName, "");
    assert.equal(result.revision, 0);
    assert.equal(result.items[0].finalUnitPrice, 6500);
    assert.equal(result.totalPrice, 13000);
  });
});

describe("multi-rod quotes", () => {
  it("rounds per unit down for purchase and up for sale before multiplying", () => {
    assert.equal(adjustedUnitPrice(15900, 0.7, "purchase"), 11000);
    assert.equal(adjustedUnitPrice(15900, 0.7, "sale"), 12000);
    assert.equal(adjustedUnitPrice(10000, 1, "purchase"), 10000);
    assert.equal(adjustedUnitPrice(10000, 0, "sale"), 0);
    assert.throws(() => adjustedUnitPrice(10000, 1.01, "purchase"));
    assert.throws(() => adjustedUnitPrice(Number.NaN, 0.7, "purchase"));
  });

  it("keeps exact thousand-won percentage boundaries in both modes", () => {
    for (const [base, rate, expected] of [
      [90000, 0.7, 63000],
      [100000, 0.29, 29000],
      [50000, 0.56, 28000],
    ]) {
      assert.equal(adjustedUnitPrice(base, rate, "purchase"), expected);
      assert.equal(adjustedUnitPrice(base, rate, "sale"), expected);
    }
    for (let percent = 0; percent <= 100; percent++) {
      assert.equal(adjustedUnitPrice(100000, percent / 100, "purchase"), percent * 1000);
      assert.equal(adjustedUnitPrice(100000, percent / 100, "sale"), percent * 1000);
    }
  });

  it("still rounds amounts adjacent to a boundary and retains fractional rates", () => {
    assert.equal(adjustedUnitPrice(89999, 0.7, "purchase"), 62000);
    assert.equal(adjustedUnitPrice(89999, 0.7, "sale"), 63000);
    assert.equal(adjustedUnitPrice(90001, 0.7, "purchase"), 63000);
    assert.equal(adjustedUnitPrice(90001, 0.7, "sale"), 64000);
    assert.equal(adjustedUnitPrice(80000, 0.125, "purchase"), 10000);
    assert.equal(adjustedUnitPrice(90000, 0.33333333, "purchase"), 29000);
    assert.equal(adjustedUnitPrice(90000, 0.33333333, "sale"), 30000);
  });

  it("snapshots the correct boundary price before multiplying quote quantities", () => {
    const entry = group("rod-1", 3);
    entry.rod.purchaseLengthPrices["18"] = 90000;
    entry.calculations[0].discountRate = 0.7;
    const items = quoteItemsFromDraft(upsertDraftRod(emptyDraft(), entry));
    assert.equal(items[0].finalUnitPrice, 63000);
    assert.equal(quoteTotals(items).totalPrice, 189000);
  });

  it("keeps quantities for different rods with the same length independent", () => {
    let draft = upsertDraftRod(emptyDraft(), group("rod-1", 2));
    draft = upsertDraftRod(draft, group("rod-2", 3));
    const items = quoteItemsFromDraft(draft);
    assert.equal(draft.rods.length, 2);
    assert.deepEqual(items.map((item) => item.quantity), [2, 3]);
    assert.deepEqual(quoteTotals(items), { totalQuantity: 5, totalPrice: 50000, totalOriginalPrice: 79500 });
    assert.equal(quoteTotals(quoteItemsFromDraft({ ...draft, mode: "sale" })).totalPrice, 80000);
    assert.deepEqual(quoteItemsFromDraft(draft).map((item) => item.rate), [0.65, 0.65]);
  });

  it("edits an existing rod group without duplicate lines or changes to other rods", () => {
    let draft = upsertDraftRod(emptyDraft(), group("rod-1", 2));
    draft = upsertDraftRod(draft, group("rod-2", 3));
    const previous = draft;
    draft = upsertDraftRod(draft, group("rod-1", 4));
    assert.equal(draft.rods.length, 2);
    assert.deepEqual(quoteItemsFromDraft(draft).map((item) => item.quantity), [4, 3]);
    assert.deepEqual(quoteItemsFromDraft(previous).map((item) => item.quantity), [2, 3]);
  });

  it("captures catalogue prices so later mutations cannot change draft totals", () => {
    const original = group();
    const draft = upsertDraftRod(emptyDraft(), original);
    original.rod.purchaseLengthPrices["18"] = 900000;
    original.calculations[0].quantity = 99;
    assert.equal(quoteTotals(quoteItemsFromDraft(draft)).totalPrice, 20000);
    assert.equal(quoteItemsFromDraft(draft)[0].quantity, 2);
  });

  it("removes zero quantities and preserves customer metadata on removal", () => {
    let draft = { ...emptyDraft(), customerName: "김민수", note: "방문 상담" };
    draft = upsertDraftRod(draft, group("rod-1", 2));
    draft = upsertDraftRod(draft, group("rod-2", 3));
    draft = upsertDraftRod(draft, group("rod-1", 0));
    assert.equal(draft.rods.length, 1);
    assert.equal(draft.rods[0].rod.id, "rod-2");
    const removed = removeDraftRod(draft, "rod-2");
    assert.deepEqual(removed.rods, []);
    assert.equal(removed.customerName, "김민수");
    assert.equal(removed.note, "방문 상담");
  });

  it("validates quote limits, empty quantities, nonfinite prices and invalid rates", () => {
    const original = record();
    assert.doesNotThrow(() => validateQuote(original));
    for (const changed of [
      { title: " " },
      { title: "a".repeat(121) },
      { note: "a".repeat(4001) },
      { customerName: "a".repeat(121) },
      { items: [] },
      { items: Array.from({ length: 501 }, () => original.items[0]) },
      { items: [{ ...original.items[0], quantity: 0 }] },
      { items: [{ ...original.items[0], quantity: 0.5 }] },
      { items: [{ ...original.items[0], rate: 1.1 }] },
      { items: [{ ...original.items[0], finalUnitPrice: Infinity }] },
    ]) assert.throws(() => validateQuote({ ...original, ...changed }));
  });

  it("copies all rods, customer, quantities, saved prices, total and memo", () => {
    const original = record();
    const items = quoteItemsFromDraft(upsertDraftRod(upsertDraftRod(emptyDraft(), group()), group("rod-2", 3)));
    const result = buildQuoteText({ ...original, items, ...quoteTotals(items) });
    for (const expected of ["고객: 김민수", "[송원] 독야1", "[송원] 체어맨 블루", "18칸 · 2대", "18칸 · 3대", "단가 10,000원", "총 대수: 5대", "총 견적 금액: 50,000원", "메모: 토요일 방문"]) {
      assert.ok(result.includes(expected), expected);
    }
  });
});

describe("grouped quote receipt summaries", () => {
  it("weights the actual applied ratio by original amounts rather than lines or quantities", () => {
    const items = [
      snapshotItem(),
      snapshotItem({ fishingRodId: "rod-2", quantity: 3, unitPrice: 10000, rate: 0.9, finalUnitPrice: 9000 }),
    ];
    assert.deepEqual(quoteSummary(items), {
      totalQuantity: 4,
      totalOriginalPrice: 130000,
      totalPrice: 77000,
      appliedRate: 77 / 130,
    });
    assert.equal(formatAppliedRate(quoteSummary(items).appliedRate), "59.23%");
  });

  it("uses rounded per-unit prices and preserves saved final-price snapshots", () => {
    const items = quoteItemsFromDraft(upsertDraftRod(emptyDraft(), group()));
    assert.equal(items[0].rate, 0.65);
    assert.equal(items[0].finalUnitPrice, 10000);
    assert.equal(formatAppliedRate(quoteSummary(items).appliedRate), "62.89%");

    const saved = normalizeQuoteRecord({
      ...record(),
      items: [{ ...items[0], rate: 0.99, finalUnitPrice: 6500 }],
    });
    assert.equal(quoteSummary(saved.items).totalPrice, 13000);
    assert.equal(quoteSummary(saved.items).appliedRate, 65 / 159);
    assert.equal(formatAppliedRate(quoteSummary(saved.items).appliedRate), "40.88%");
  });

  it("shows no applied ratio for zero original value, including an empty quote", () => {
    assert.deepEqual(quoteSummary([]), {
      totalQuantity: 0, totalPrice: 0, totalOriginalPrice: 0, appliedRate: null,
    });
    const items = [snapshotItem({ quantity: 3, unitPrice: 0, finalUnitPrice: 0 })];
    assert.equal(quoteSummary(items).appliedRate, null);
    assert.equal(groupQuoteItems(items)[0].appliedRate, null);
    assert.equal(formatAppliedRate(quoteSummary(items).appliedRate), "—");
  });

  it("groups noncontiguous snapshots in first-appearance order without merging different rod IDs", () => {
    const first = snapshotItem();
    const otherId = snapshotItem({ fishingRodId: "rod-2" });
    const again = snapshotItem({ length: 20, quantity: 2 });
    const renamed = snapshotItem({ fishingRodName: "독야1 리뉴얼" });
    const rebranded = snapshotItem({ brandName: "다른 브랜드" });
    const manual = snapshotItem({ fishingRodId: "", fishingRodName: "수기 낚시대" });
    const manualAgain = { ...manual, length: 22 };
    const otherManualBrand = { ...manual, brandName: "다른 브랜드" };
    const items = [first, otherId, again, renamed, rebranded, manual, manualAgain, otherManualBrand];
    const groups = groupQuoteItems(items);

    assert.equal(groups.length, 6);
    assert.equal(new Set(groups.map((entry) => entry.key)).size, 6);
    assert.deepEqual(groups.map((entry) => [entry.fishingRodId, entry.brandName, entry.fishingRodName]), [
      ["rod-1", "송원", "독야1"],
      ["rod-2", "송원", "독야1"],
      ["rod-1", "송원", "독야1 리뉴얼"],
      ["rod-1", "다른 브랜드", "독야1"],
      ["", "송원", "수기 낚시대"],
      ["", "다른 브랜드", "수기 낚시대"],
    ]);
    assert.deepEqual(groups[0].items, [first, again]);
    assert.equal(groups[0].items[0], items[0]);
    assert.equal(groups[0].items[1], items[2]);
    assert.deepEqual(groups[4].items, [manual, manualAgain]);
    assert.equal(groups[0].totalQuantity, 3);
    assert.equal(groups[0].totalOriginalPrice, 300000);
    assert.equal(groups[0].totalPrice, 150000);
    assert.equal(groups[0].appliedRate, 0.5);
    assert.equal(items.length, 8);
  });

  it("separates copied rod groups and includes original prices, actual ratios and all totals", () => {
    const first = snapshotItem({ unitPrice: 15900, rate: 0.65, finalUnitPrice: 10000 });
    const second = snapshotItem({ fishingRodId: "rod-2", fishingRodName: "체어맨 블루", unitPrice: 100000, rate: 0.7, finalUnitPrice: 70000 });
    const items = [first, second, { ...first, length: 20, quantity: 2 }];
    const result = buildQuoteText({ ...record(), items, ...quoteTotals(items) });

    assert.equal(result.split("[송원] 독야1").length - 1, 1);
    assert.ok(result.includes("18칸 · 1대 · 기준 단가 15,900원 · 최종 단가 10,000원 · 합계 10,000원"));
    assert.ok(result.includes("칸수 범위: 18~20칸\n총 대수: 3대\n총 가격: 47,700원\n평균 적용율: 62.89%\n총 매입가격: 30,000원\n\n[송원] 체어맨 블루"));
    assert.ok(result.includes("전체 합계\n총 대수: 4대\n총 가격: 147,700원\n평균 적용율: 67.7%\n총 매입가격: 100,000원\n총 견적 금액: 100,000원"));
    assert.ok(result.includes("평균 적용율은 천 원 단위 조정 후 최종 금액 ÷ 총 가격으로 계산합니다."));
    assert.ok(result.includes("고객: 김민수"));
    assert.ok(result.includes("메모: 토요일 방문"));
  });

  it("copies five saved-length group fields and omits a range from the four-field grand summary", () => {
    const items = [
      snapshotItem({ length: 36 }),
      snapshotItem({ length: 28, quantity: 2 }),
      snapshotItem({ length: 32 }),
      snapshotItem({ fishingRodId: "rod-2", fishingRodName: "체어맨 블루", length: 32 }),
      snapshotItem({ fishingRodId: "rod-2", fishingRodName: "체어맨 블루", length: 32, quantity: 2 }),
    ];
    const result = buildQuoteText({ ...record(), items, ...quoteTotals(items) });
    const blocks = result.split("\n\n");
    const groupBlocks = blocks.filter((block) => block.startsWith("[송원]"));
    assert.deepEqual(groupBlocks[0].split("\n").slice(-5), [
      "칸수 범위: 28~36칸", "총 대수: 4대", "총 가격: 400,000원", "평균 적용율: 50%", "총 매입가격: 200,000원",
    ]);
    assert.deepEqual(groupBlocks[1].split("\n").slice(-5), [
      "칸수 범위: 32칸", "총 대수: 3대", "총 가격: 300,000원", "평균 적용율: 50%", "총 매입가격: 150,000원",
    ]);
    const grandSummary = blocks.find((block) => block.startsWith("전체 합계\n"));
    assert.ok(grandSummary);
    assert.deepEqual(grandSummary.split("\n").slice(1, 5), [
      "총 대수: 7대", "총 가격: 700,000원", "평균 적용율: 50%", "총 매입가격: 350,000원",
    ]);
    assert.ok(!grandSummary.includes("칸수 범위"));
  });

  it("uses sale-price labels and the saved final amount without recalculating it", () => {
    const items = [snapshotItem({ unitPrice: 15900, rate: 0.7, finalUnitPrice: 12000 })];
    const result = buildQuoteText({ ...record(), mode: "sale", items, ...quoteTotals(items) });
    assert.equal(result.split("총 판매가격: 12,000원").length - 1, 2);
    assert.ok(result.includes("평균 적용율: 75.47%"));
    assert.ok(!result.includes("매입가격:"));
    assert.ok(result.includes("총 견적 금액: 12,000원"));
  });
});

describe("Korean presentation formats", () => {
  it("uses Korean number grouping and won labels", () => {
    assert.equal(formatNumber(1234567.5), "1,234,567.5");
    assert.equal(formatMoney(1234567), "1,234,567원");
  });

  it("formats actual applied percentages with at most two decimal places", () => {
    assert.equal(formatAppliedRate(null), "—");
    assert.equal(formatAppliedRate(0), "0%");
    assert.equal(formatAppliedRate(0.7), "70%");
    assert.equal(formatAppliedRate(0.6289308176), "62.89%");
    assert.equal(formatAppliedRate(1.25), "125%");
  });

  it("formats empty, single, repeated and unsorted saved length ranges without mutation", () => {
    assert.equal(formatLengthRange([]), "—");
    assert.equal(formatLengthRange([32]), "32칸");
    assert.equal(formatLengthRange([32, 32, 32]), "32칸");
    const lengths = [36, 28, 32, 28];
    assert.equal(formatLengthRange(lengths), "28~36칸");
    assert.deepEqual(lengths, [36, 28, 32, 28]);
  });

  it("formats dates and download filenames in Asia/Seoul", () => {
    const date = "2026-11-03T15:05:06.000Z";
    assert.equal(formatDateTime(date), "2026.11.04 00:05");
    assert.equal(formatDateKey(date), "20261104-000506");
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatDateTime("invalid"), "—");
  });
});
