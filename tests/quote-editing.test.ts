import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupQuoteItems, quoteTotals, type EquipmentQuoteItem, type FishingRod, type QuoteItem, type RodQuoteItem } from "../src/lib/domain";
import { appendQuoteItems, applySavedRodGroupEditor, createSavedRodGroupEditor, savedRodEditUnitPrice, type SavedRodGroupEditor } from "../src/lib/quote-editing";

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

const catalogRod = (changes: Partial<FishingRod> = {}): FishingRod => ({
  id: "rod-1", name: "변경된 제품명", brandId: "new-brand", minValue: 28, maxValue: 36, usedPrice: 0,
  lengthPrices: {}, purchaseLengthPrices: { "28": 90000, "32": 900000, "36": 110000 },
  saleLengthPrices: { "28": 190000, "32": 1900000, "36": 210000 }, ...changes,
});
const groupKey = (items: QuoteItem[]) => groupQuoteItems(items).find(group => group.kind === "rod")!.key;
const unchanged = (editor: SavedRodGroupEditor) => editor.rows.map(row => ({ key: row.key, quantity: row.item.quantity, rate: row.item.rate }));

describe("editing a saved rod group", () => {
  it("retains duplicate saved lengths and offers only missing catalogue lengths with historical identity", () => {
    const items = [rod({ length: 32 }), rod({ length: 28 }), rod({ length: 32, rate: .65, finalUnitPrice: 65000 })];
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase", catalogRod());
    assert.deepEqual(editor.rows.map(row => [row.sourceIndex, row.item.length, row.item.unitPrice]), [
      [1, 28, 100001], [0, 32, 100001], [2, 32, 100001], [null, 36, 110000],
    ]);
    assert.equal(editor.rows[3].item.quantity, 0);
    assert.equal(editor.rows[3].item.rate, .7);
    assert.equal(editor.rows[3].item.fishingRodName, "기록 당시 낚시대");
    assert.equal(editor.rows[3].item.brandName, "기록 당시 브랜드");
    assert.ok(Object.isFrozen(editor) && Object.isFrozen(editor.rows) && Object.isFrozen(editor.rows[0].item));
  });

  it("changes quantities without rounding saved prices or moving interleaved unrelated rows", () => {
    const items = [rod(), equipment(), rod({ length: 28 }), rod({ fishingRodId: "other" })];
    const before = structuredClone(items);
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase");
    const changes = unchanged(editor).map(change => ({ ...change, quantity: change.key === "saved-0" ? 5 : change.quantity }));
    const result = applySavedRodGroupEditor(items, editor, changes, "purchase");
    assert.deepEqual(result, [{ ...items[0], quantity: 5 }, ...items.slice(1)]);
    assert.equal(savedRodEditUnitPrice(editor.rows[0], editor.rows[0].item.rate, "purchase"), 69999);
    assert.deepEqual(items, before);
    assert.ok(result[1].kind === "equipment");
    result[1].components[0].choiceName = "변경";
    assert.equal((items[1] as EquipmentQuoteItem).components[0].choiceName, "롱플라이");
    assert.equal(Object.hasOwn(result[0], "kind"), false);
  });

  it("recalculates only a changed rate from its saved base price in either mode", () => {
    const items = [rod({ quantity: 2 }), rod({ length: 36, quantity: 1, finalUnitPrice: 12345 })];
    for (const mode of ["purchase", "sale"] as const) {
      const editor = createSavedRodGroupEditor(items, groupKey(items), mode, catalogRod());
      const changes = unchanged(editor).map(change => change.key === "saved-0" ? { ...change, rate: .71 } : change);
      const result = applySavedRodGroupEditor(items, editor, changes, mode) as RodQuoteItem[];
      assert.equal(result[0].unitPrice, 100001);
      assert.equal(result[0].finalUnitPrice, mode === "purchase" ? 71000 : 72000);
      assert.equal(result[1].finalUnitPrice, 12345);
      assert.equal(quoteTotals(result).totalPrice, result[0].finalUnitPrice * 2 + 12345);
    }
  });

  it("edits repeated lengths independently instead of collapsing distinct prices and rates", () => {
    const items = [rod({ quantity: 4 }), rod({ quantity: 1, unitPrice: 110001, rate: .65, finalUnitPrice: 71000 })];
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase");
    const result = applySavedRodGroupEditor(items, editor, [
      { key: "saved-0", quantity: 2, rate: .7 }, { key: "saved-1", quantity: 3, rate: .6 },
    ], "purchase");
    assert.deepEqual(result, [{ ...items[0], quantity: 2 }, { ...items[1], quantity: 3, rate: .6, finalUnitPrice: 66000 }]);
  });

  it("removes zero quantities and adds new lengths using captured prices without renaming saved identities", () => {
    const items = [rod(), equipment(), rod({ length: 28 })];
    const catalog = catalogRod();
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase", catalog);
    catalog.purchaseLengthPrices["36"] = 999999;
    const changes = unchanged(editor).map(change => ({ ...change, quantity: change.key === "saved-0" ? 0 : change.key === "new-36" ? 2 : change.quantity }));
    const result = applySavedRodGroupEditor(items, editor, changes, "purchase");
    assert.deepEqual(result.slice(0, 2), [items[1], items[2]]);
    assert.deepEqual(result[2], { fishingRodId: "rod-1", fishingRodName: "기록 당시 낚시대", brandName: "기록 당시 브랜드",
      length: 36, quantity: 2, unitPrice: 110000, rate: .7, finalUnitPrice: 77000 });
  });

  it("edits deleted or manual rods and isolates same-ID groups with different saved names", () => {
    const items = [rod({ fishingRodId: "" }), rod({ fishingRodId: "", fishingRodName: "별도 이름" })];
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase", catalogRod());
    assert.equal(editor.rows.length, 1);
    const result = applySavedRodGroupEditor(items, editor, [{ key: "saved-0", quantity: 9, rate: .7 }], "purchase");
    assert.deepEqual(result, [{ ...items[0], quantity: 9 }, items[1]]);
    const named = [rod(), rod({ fishingRodName: "변경 후 저장된 이름" })];
    const namedEditor = createSavedRodGroupEditor(named, groupKey(named), "purchase");
    assert.deepEqual(applySavedRodGroupEditor(named, namedEditor, [{ key: "saved-0", quantity: 1, rate: .7 }], "purchase"),
      [{ ...named[0], quantity: 1 }, named[1]]);
  });

  it("rejects a stale group or mode rather than overwriting later edits", () => {
    const items = [rod(), equipment()];
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase");
    const changes = unchanged(editor);
    for (const changed of [
      [rod({ quantity: 4 }), equipment()], [rod({ finalUnitPrice: 70000 }), equipment()],
      [rod(), rod({ length: 36 }), equipment()], [equipment(), rod()],
    ]) assert.throws(() => applySavedRodGroupEditor(changed, editor, changes, "purchase"), /변경/);
    assert.throws(() => applySavedRodGroupEditor(items, editor, changes, "sale"), /변경/);
    assert.throws(() => applySavedRodGroupEditor([equipment()], editor, changes, "purchase"), /찾을/);
  });

  it("rejects invalid, incomplete or oversized edits atomically, including an empty selected group", () => {
    const items = [rod(), equipment()];
    const before = structuredClone(items);
    const editor = createSavedRodGroupEditor(items, groupKey(items), "purchase");
    const change = unchanged(editor)[0];
    assert.throws(() => applySavedRodGroupEditor(items, editor, [{ ...change, quantity: 0 }], "purchase"), /한 대 이상/);
    assert.throws(() => applySavedRodGroupEditor(items, editor, [], "purchase"), /입력 내용/);
    assert.throws(() => applySavedRodGroupEditor(items, editor, [change, change], "purchase"), /입력 내용/);
    for (const quantity of [-1, .5, NaN, Infinity]) assert.throws(() => applySavedRodGroupEditor(items, editor, [{ ...change, quantity }], "purchase"), /수량/);
    for (const rate of [-.1, 1.1, NaN, Infinity]) assert.throws(() => applySavedRodGroupEditor(items, editor, [{ ...change, rate }], "purchase"), /적용율/);
    assert.throws(() => applySavedRodGroupEditor(items, editor, [{ ...change, quantity: Number.MAX_SAFE_INTEGER }], "purchase"), /합계/);
    const full = [rod(), ...Array.from({ length: 499 }, (_, index) => rod({ fishingRodId: `other-${index}` }))];
    const fullEditor = createSavedRodGroupEditor(full, groupKey(full), "purchase", catalogRod());
    assert.throws(() => applySavedRodGroupEditor(full, fullEditor, unchanged(fullEditor).map(value => ({ ...value, quantity: 1 })), "purchase"), /500/);
    assert.deepEqual(items, before);
  });
});
