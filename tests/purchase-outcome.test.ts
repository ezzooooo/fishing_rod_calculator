import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Firestore } from "firebase/firestore";
import { normalizeQuoteRecord, quoteTotals, type EquipmentQuoteItem, type QuoteRecord } from "../src/lib/domain";
import { DemoRepository } from "../src/lib/demo-repository";
import { FirebaseRepository, QuoteConflictError, type AppRepository, type QuoteInput } from "../src/lib/repository";
import { buildPurchaseOutcome, emptyPurchaseOutcome, normalizePurchaseOutcome, purchaseItemsMatch, purchaseOutcomeFor, purchaseSourceItems, purchaseStatusLabel, selectedPurchaseItems, type PurchaseOutcomeInput } from "../src/lib/purchase-outcome";

function input(): QuoteInput {
  const equipment: EquipmentQuoteItem = {
    kind: "equipment", id: "equipment-line", categoryId: "tent", categoryName: "텐트", productId: null,
    productName: "원본 텐트", brandName: "브랜드", specification: "2인용", unit: "동", quantity: 2,
    pricingMode: "direct", baseUnitPrice: null, directUnitPrice: 100123, components: [{ groupId: "fly", groupName: "플라이", choiceId: "long", choiceName: "롱플라이", quantity: 1, unitPrice: -123 }],
    unitPrice: null, rate: null, finalUnitPrice: 100000,
  };
  return { title: "원본 견적", customerName: "고객", note: "견적 메모", mode: "purchase", items: [
    { fishingRodId: "rod", fishingRodName: "원본 낚시대", brandName: "브랜드", length: 32, quantity: 3, unitPrice: 100000, rate: 0.7, finalUnitPrice: 70000 },
    equipment,
  ] };
}
function record(): QuoteRecord {
  const value = input();
  return { ...value, ...quoteTotals(value.items), id: "quote", createdBy: "original-staff", createdAt: "2026-11-05T15:30:00.000Z", updatedAt: null, revision: 0 };
}
function result(overrides: Partial<PurchaseOutcomeInput> = {}): PurchaseOutcomeInput {
  return { status: "partial", purchasedOn: "2026-11-06", actualAmount: 260123, reason: "", note: "현장 협의", quantities: [1, 2], ...overrides };
}
function readQuote(repository: AppRepository, id: string): Promise<QuoteRecord | null> {
  return new Promise((resolve, reject) => {
    const stop = repository.watchQuote(id, value => { stop(); resolve(value); }, reject);
  });
}

describe("purchase outcome snapshots", () => {
  it("compares snapshot contents independently from object property order while retaining item and component order", () => {
    const original = record().items;
    function reorder(value: unknown): unknown {
      if (Array.isArray(value)) return value.map(reorder);
      if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, field]) => [key, reorder(field)]));
      return value;
    }
    const reordered = reorder(original) as typeof original;
    assert.equal(purchaseItemsMatch(original, reordered), true);
    assert.ok(original[0].kind !== "equipment");
    assert.equal(purchaseItemsMatch(original, [{ ...original[0], kind: undefined }, original[1]]), true, "An undefined object property is ignored like JSON");
    assert.equal(purchaseItemsMatch(original, [{ ...original[0], finalUnitPrice: 70001 }, original[1]]), false);
    assert.equal(purchaseItemsMatch(original, [{ ...original[0], quantity: 1 }, original[1]]), false);
    assert.equal(purchaseItemsMatch(original, [...original].reverse()), false);
    assert.ok(original[1].kind === "equipment");
    const changedComponent = { ...original[1], components: [{ ...original[1].components[0], quantity: 2 }] };
    assert.equal(purchaseItemsMatch(original, [original[0], changedComponent]), false);
    const withTwoComponents = { ...original[1], components: [...original[1].components, { ...original[1].components[0], choiceId: "half", choiceName: "하프플라이" }] };
    assert.equal(purchaseItemsMatch([withTwoComponents], [{ ...withTwoComponents, components: [...withTwoComponents.components].reverse() }]), false);
  });

  it("leaves legacy quotes unconfirmed without changing dates, amounts, or item snapshots", () => {
    const original = record();
    const saved = normalizeQuoteRecord(original as unknown as Record<string, unknown>);
    assert.deepEqual(purchaseOutcomeFor(saved), emptyPurchaseOutcome());
    assert.equal(saved.createdAt, original.createdAt);
    assert.equal(saved.totalPrice, original.totalPrice);
    assert.deepEqual(saved.items, original.items);
    assert.equal(original.purchaseOutcome, undefined);
    assert.equal(purchaseStatusLabel("partial"), "일부 매입");
  });

  it("preserves partial rod quantities and complete equipment component snapshots without repricing", () => {
    const original = record();
    const outcome = buildPurchaseOutcome(original, result());
    assert.equal(outcome.actualAmount, 260123);
    assert.equal(outcome.purchasedOn, "2026-11-06");
    assert.deepEqual(outcome.quantities, [1, 2]);
    const purchased = selectedPurchaseItems(outcome);
    assert.deepEqual(purchased.map(item => item.quantity), [1, 2]);
    assert.equal(purchased[0].finalUnitPrice, 70000);
    assert.ok(purchased[1].kind === "equipment");
    assert.equal(purchased[1].components[0].unitPrice, -123);
    assert.equal(purchased[1].unitPrice, null);
    outcome.quotedItems[0].finalUnitPrice = 999999;
    outcome.quantities[0] = 2;
    assert.equal(original.items[0].finalUnitPrice, 70000);
    assert.equal(original.items[0].quantity, 3);
    purchased[1].components[0].choiceName = "화면에서 변경";
    assert.ok(outcome.quotedItems[1].kind === "equipment");
    assert.equal(outcome.quotedItems[1].components[0].choiceName, "롱플라이");
  });

  it("distinguishes unknown actual amounts from an explicitly recorded zero and accepts real calendar dates", () => {
    assert.throws(() => buildPurchaseOutcome(record(), result({ actualAmount: null })), /실제 매입금액/);
    assert.equal(buildPurchaseOutcome(record(), result({ actualAmount: 0 })).actualAmount, 0);
    assert.equal(buildPurchaseOutcome(record(), result({ purchasedOn: "2024-02-29" })).purchasedOn, "2024-02-29");
    for (const purchasedOn of [null, "", "2026-02-29", "2026-02-30", "2026-11-6", "2026-11-06T00:00:00Z", "0000-01-01"]) {
      assert.throws(() => buildPurchaseOutcome(record(), result({ purchasedOn })), /매입일/);
    }
    for (const actualAmount of [-1, Number.NaN, Infinity]) assert.throws(() => buildPurchaseOutcome(record(), result({ actualAmount })), /실제 매입금액/);
  });

  it("requires selected quantities within each quoted quantity and distinguishes complete from partial acquisitions", () => {
    for (const quantities of [[], [1], [0, 0], [4, 0], [-1, 1], [0.5, 1], [Infinity, 1]]) {
      assert.throws(() => buildPurchaseOutcome(record(), result({ quantities })), /수량/);
    }
    assert.throws(() => buildPurchaseOutcome(record(), result({ quantities: [3, 2] })), /매입 완료/);
    assert.throws(() => buildPurchaseOutcome(record(), result({ status: "completed" })), /모든 견적 수량/);
    const completed = buildPurchaseOutcome(record(), result({ status: "completed", quantities: [3, 2], actualAmount: 410000 }));
    assert.equal(completed.status, "completed");
    assert.deepEqual(selectedPurchaseItems(completed), record().items);
  });

  it("retains the acquisition source when quote items change and replaces it only with explicit current-item selection", () => {
    const original = record();
    const purchaseOutcome = buildPurchaseOutcome(original, result());
    const changed = { ...original, items: [{ ...original.items[0], quantity: 1, finalUnitPrice: 999000 }], purchaseOutcome };
    assert.deepEqual(purchaseSourceItems(changed), original.items);
    const corrected = buildPurchaseOutcome(changed, result({ actualAmount: 260000 }));
    assert.deepEqual(corrected.quotedItems, original.items);
    const refreshed = buildPurchaseOutcome(changed, result({ status: "completed", useCurrentQuoteItems: true, quantities: [1] }));
    assert.deepEqual(refreshed.quotedItems, changed.items);
    assert.equal(refreshed.quotedItems[0].finalUnitPrice, 999000);
    assert.deepEqual(purchaseOutcome.quotedItems, original.items);
  });

  it("clears transaction-only fields for open or unsuccessful statuses while retaining the result note", () => {
    for (const status of ["unconfirmed", "in_progress", "not_completed"] as const) {
      const outcome = buildPurchaseOutcome(record(), result({ status, reason: "가격 불일치" }));
      assert.equal(outcome.purchasedOn, null);
      assert.equal(outcome.actualAmount, null);
      assert.deepEqual(outcome.quotedItems, []);
      assert.deepEqual(outcome.quantities, []);
      assert.equal(outcome.note, "현장 협의");
      assert.equal(outcome.reason, status === "not_completed" ? "가격 불일치" : "");
    }
  });

  it("normalizes server metadata and clones saved snapshots without shifting a Korean calendar date", () => {
    const outcome = buildPurchaseOutcome(record(), result());
    const saved = normalizePurchaseOutcome({ ...outcome, updatedAt: { seconds: 1793977200, nanoseconds: 0 }, updatedBy: "staff-2" });
    assert.equal(saved.purchasedOn, "2026-11-06");
    assert.equal(saved.updatedBy, "staff-2");
    assert.equal(saved.updatedAt, "2026-11-06T15:00:00.000Z");
    saved.quotedItems[0].quantity = 88;
    saved.quantities[0] = 99;
    assert.equal(outcome.quotedItems[0].quantity, 3);
    assert.equal(outcome.quantities[0], 1);
  });

  it("rejects unsupported modes, malformed states, oversized notes, and invalid snapshot data", () => {
    assert.throws(() => buildPurchaseOutcome({ ...record(), mode: "sale" }, result()), /매입 견적/);
    assert.throws(() => buildPurchaseOutcome(record(), result({ status: "unknown" as PurchaseOutcomeInput["status"] })), /진행 상태/);
    assert.throws(() => buildPurchaseOutcome(record(), result({ note: "가".repeat(2001) })), /2,000자/);
    assert.throws(() => buildPurchaseOutcome(record(), result({ status: "not_completed", reason: "가".repeat(121) })), /120자/);
    assert.throws(() => normalizePurchaseOutcome({ ...buildPurchaseOutcome(record(), result()), quotedItems: [{ ...record().items[0], quantity: 0 }] }), /수량/);
  });
});

describe("purchase outcome repository isolation", () => {
  it("starts new purchase quotes in progress and leaves old and sale quotes unconfirmed", async () => {
    const repository = new DemoRepository();
    assert.equal(purchaseOutcomeFor((await readQuote(repository, "sample-quote"))!).status, "unconfirmed");
    const id = await repository.createQuote(input());
    assert.equal(purchaseOutcomeFor((await readQuote(repository, id))!).status, "in_progress");
    const saleId = await repository.createQuote({ ...input(), mode: "sale" });
    assert.equal(purchaseOutcomeFor((await readQuote(repository, saleId))!).status, "unconfirmed");
  });

  it("updates only acquisition metadata, preserves quoted totals and author, and returns independent nested snapshots", async () => {
    const repository = new DemoRepository();
    const id = await repository.createQuote(input());
    const original = (await readQuote(repository, id))!;
    const change = result();
    await repository.updatePurchaseOutcome(original, change);
    change.quantities[0] = 3;
    const saved = (await readQuote(repository, id))!;
    assert.deepEqual(saved.items, original.items);
    assert.equal(saved.totalPrice, original.totalPrice);
    assert.equal(saved.totalQuantity, original.totalQuantity);
    assert.equal(saved.createdAt, original.createdAt);
    assert.equal(saved.createdBy, original.createdBy);
    assert.equal(saved.revision, original.revision + 1);
    assert.ok(saved.updatedAt);
    const outcome = purchaseOutcomeFor(saved);
    assert.equal(outcome.updatedBy, "demo-staff");
    assert.equal(outcome.actualAmount, 260123);
    assert.deepEqual(outcome.quantities, [1, 2]);
    assert.ok(saved.purchaseOutcome && saved.purchaseOutcome.quotedItems[1].kind === "equipment");
    saved.purchaseOutcome.quotedItems[1].components[0].choiceName = "변경";
    saved.purchaseOutcome.quantities[0] = 2;
    const again = purchaseOutcomeFor((await readQuote(repository, id))!);
    assert.equal(again.quantities[0], 1);
    assert.ok(again.quotedItems[1].kind === "equipment");
    assert.equal(again.quotedItems[1].components[0].choiceName, "롱플라이");
  });

  it("preserves acquisition snapshots during ordinary quote edits even when the caller omits or forges the result", async () => {
    const repository = new DemoRepository();
    const id = await repository.createQuote(input());
    await repository.updatePurchaseOutcome((await readQuote(repository, id))!, result());
    const original = (await readQuote(repository, id))!;
    const originalOutcome = purchaseOutcomeFor(original);
    await repository.updateQuote({ ...original, title: "견적만 수정", items: [{ ...original.items[0], quantity: 4 }], purchaseOutcome: undefined });
    const edited = (await readQuote(repository, id))!;
    assert.deepEqual(purchaseOutcomeFor(edited), originalOutcome);
    await repository.updateQuote({ ...edited, purchaseOutcome: emptyPurchaseOutcome("not_completed") });
    assert.deepEqual(purchaseOutcomeFor((await readQuote(repository, id))!), originalOutcome);
  });

  it("rejects stale outcome and quote editors in both directions without overwriting the first change", async () => {
    const repository = new DemoRepository();
    const id = await repository.createQuote(input());
    const original = (await readQuote(repository, id))!;
    await repository.updatePurchaseOutcome(original, result());
    await assert.rejects(repository.updatePurchaseOutcome(original, result({ actualAmount: 1 })), QuoteConflictError);
    await assert.rejects(repository.updateQuote({ ...original, title: "과거 편집" }), QuoteConflictError);
    const current = (await readQuote(repository, id))!;
    await repository.updateQuote({ ...current, note: "먼저 저장" });
    await assert.rejects(repository.updatePurchaseOutcome(current, result({ actualAmount: 1 })), QuoteConflictError);
    assert.equal(purchaseOutcomeFor((await readQuote(repository, id))!).actualAmount, 260123);
  });

  it("rejects invalid, sale-only, or deleted quote mutations without a partial write", async () => {
    const repository = new DemoRepository();
    const id = await repository.createQuote(input());
    const original = (await readQuote(repository, id))!;
    await assert.rejects(repository.updatePurchaseOutcome(original, result({ quantities: [4, 0] })), /수량/);
    assert.deepEqual(await readQuote(repository, id), original);
    const saleId = await repository.createQuote({ ...input(), mode: "sale" });
    await assert.rejects(repository.updatePurchaseOutcome((await readQuote(repository, saleId))!, result()), /매입 견적/);
    await repository.deleteQuote(id);
    await assert.rejects(repository.updatePurchaseOutcome(original, result()), /삭제된 견적/);
    assert.equal(await readQuote(repository, id), null);
  });

  it("checks enabled staff authorization before accessing Firebase", async () => {
    for (const session of [{ uid: null, authorized: false }, { uid: "staff", authorized: false }, { uid: null, authorized: true }]) {
      const repository = new FirebaseRepository({} as Firestore, () => session);
      await assert.rejects(repository.updatePurchaseOutcome(record(), result()), /로그인한 직원만/);
    }
  });
});
