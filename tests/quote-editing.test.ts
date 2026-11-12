import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteTotals, type EquipmentQuoteItem, type QuoteItem, type RodQuoteItem } from "../src/lib/domain";
import { appendQuoteItems } from "../src/lib/quote-editing";

const rod = (changes: Partial<RodQuoteItem> = {}): RodQuoteItem => ({
  fishingRodId: "rod-1", fishingRodName: "기록 당시 낚시대", brandName: "기록 당시 브랜드",
  length: 32, quantity: 3, unitPrice: 100001, rate: .7, finalUnitPrice: 69999, ...changes,
});
const equipment = (changes: Partial<EquipmentQuoteItem> = {}): EquipmentQuoteItem => ({
  kind: "equipment", id: "tent-line", categoryId: "tent", categoryName: "텐트", productId: "tent-1",
  productName: "기록 당시 텐트", brandName: "브랜드", specification: "2인용", unit: "동", quantity: 1,
  pricingMode: "direct", baseUnitPrice: null, directUnitPrice: 100123,
  components: [{ groupId: "fly", groupName: "플라이", choiceId: "long", choiceName: "롱플라이", quantity: 1, unitPrice: -123 }],
  unitPrice: null, rate: null, finalUnitPrice: 100000, ...changes,
});

describe("adding items to saved quotations", () => {
  it("combines only identical rod snapshots and retains historical final prices without rounding", () => {
    const previous = rod();
    const addition = rod({ kind: "rod", quantity: 2 });
    const result = appendQuoteItems([previous], [addition]);
    assert.deepEqual(result, [{ ...previous, quantity: 5 }]);
    assert.equal(quoteTotals(result).totalPrice, 69999 * 5);
    assert.equal(previous.quantity, 3);
    assert.equal(addition.quantity, 2);
    assert.equal(Object.hasOwn(result[0], "kind"), false, "Legacy rod snapshots need not acquire a new kind field");
  });

  it("preserves different rod identities, catalogue prices, rates and saved final unit prices as separate rows", () => {
    const changes: Partial<RodQuoteItem>[] = [
      { fishingRodId: "rod-2" }, { fishingRodName: "다른 이름" }, { brandName: "다른 브랜드" },
      { length: 34 }, { unitPrice: 100002 }, { rate: .65 }, { finalUnitPrice: 70000 },
    ];
    for (const change of changes) {
      const previous = rod();
      const addition = rod({ quantity: 1, ...change });
      assert.deepEqual(appendQuoteItems([previous], [addition]), [previous, addition]);
    }
  });

  it("does not merge unnamed manual identities or rewrite duplicate historical rows", () => {
    const manual = rod({ fishingRodId: "" });
    assert.equal(appendQuoteItems([manual], [manual]).length, 2);
    const duplicateRows = [rod(), rod({ quantity: 1 })];
    const result = appendQuoteItems(duplicateRows, [rod({ quantity: 2 })]);
    assert.deepEqual(result.map(item => item.quantity), [5, 1]);
    assert.deepEqual(duplicateRows.map(item => item.quantity), [3, 1]);
  });

  it("keeps row order while combining successive identical additions", () => {
    const first = rod(), middle = equipment(), last = rod({ fishingRodId: "rod-2", length: 36 });
    const result = appendQuoteItems([first, middle], [last, rod({ quantity: 1 }), { ...last, quantity: 2 }]);
    assert.deepEqual(result, [{ ...first, quantity: 4 }, middle, { ...last, quantity: 5 }]);
  });

  it("always appends equipment as independent lines and deep clones all component snapshots", () => {
    const previous = equipment(), addition = equipment({ id: "another-line" });
    const result = appendQuoteItems([previous], [addition, addition]);
    assert.equal(result.length, 3);
    assert.ok(result[0].kind === "equipment" && result[1].kind === "equipment" && result[2].kind === "equipment");
    result[0].components[0].unitPrice = 99;
    result[1].components[0].choiceName = "변경";
    assert.equal(previous.components[0].unitPrice, -123);
    assert.equal(addition.components[0].choiceName, "롱플라이");
    assert.equal(result[2].components[0].choiceName, "롱플라이");
    assert.equal(result[1].finalUnitPrice, 100000);
    assert.equal(result[1].baseUnitPrice, null);
  });

  it("allows a matching quantity update at the 500-row limit but rejects additional rows atomically", () => {
    const previous: QuoteItem[] = Array.from({ length: 500 }, (_, index) => rod({ fishingRodId: `rod-${index}`, quantity: 1 }));
    const saved = structuredClone(previous);
    const result = appendQuoteItems(previous, [rod({ fishingRodId: "rod-0", quantity: 1 })]);
    assert.equal(result.length, 500);
    assert.equal(result[0].quantity, 2);
    assert.throws(() => appendQuoteItems(previous, [rod({ fishingRodId: "rod-0", quantity: 1 }), rod({ fishingRodId: "new-rod" })]), /500/);
    assert.deepEqual(previous, saved);
    assert.throws(() => appendQuoteItems([], Array.from({ length: 501 }, (_, index) => rod({ fishingRodId: `new-${index}`, quantity: 1 }))), /500/);
  });

  it("rejects invalid new quantities and arithmetic overflow without changing inputs", () => {
    const previous = rod({ quantity: Number.MAX_SAFE_INTEGER, unitPrice: 0, finalUnitPrice: 0 });
    const addition = rod({ quantity: 1, unitPrice: 0, finalUnitPrice: 0 });
    assert.throws(() => appendQuoteItems([previous], [addition]), /수량/);
    assert.equal(previous.quantity, Number.MAX_SAFE_INTEGER);
    assert.equal(addition.quantity, 1);
    for (const quantity of [0, -1, .5, Number.NaN, Infinity]) {
      assert.throws(() => appendQuoteItems([rod()], [rod({ quantity })]), /확인/);
    }
    assert.throws(() => appendQuoteItems([rod({ quantity: 1, unitPrice: Number.MAX_VALUE, finalUnitPrice: Number.MAX_VALUE })], [rod({ quantity: 1, unitPrice: Number.MAX_VALUE, finalUnitPrice: Number.MAX_VALUE })]), /확인|합계/);
  });

  it("returns independent existing snapshots when there are no additions", () => {
    const previous = [rod(), equipment()];
    const result = appendQuoteItems(previous, []);
    assert.deepEqual(result, previous);
    assert.notEqual(result[0], previous[0]);
    assert.notEqual(result[1], previous[1]);
  });
});
