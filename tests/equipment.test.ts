import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuoteText, emptyDraft, groupQuoteItems, isEquipmentItem, normalizeQuoteRecord, quoteItemName,
  quoteItemSpecification, quoteItemsFromDraft, quoteItemUnit, quoteQuantityLabel, quoteSummary, validateQuote,
  type EquipmentQuoteItem, type QuoteRecord, type RodQuoteItem,
} from "../src/lib/domain";
import {
  calculateEquipmentQuoteItem, createEquipmentPreset, equipmentOptionSnapshots, equipmentPriceForMode,
  mergeEquipmentOptionGroups, normalizeEquipmentCategory, normalizeEquipmentProduct, validateEquipmentCategory,
  validateEquipmentOptionGroups, validateEquipmentProduct, type EquipmentOptionGroup,
} from "../src/lib/equipment";

function equipment(changes: Partial<EquipmentQuoteItem> = {}): EquipmentQuoteItem {
  return calculateEquipmentQuoteItem({
    kind: "equipment", id: "line-tent", categoryId: "tent", categoryName: "텐트", productId: "tent-1",
    productName: "텐트 A", brandName: "브랜드", specification: "2인용", unit: "동", quantity: 1,
    pricingMode: "direct", baseUnitPrice: null, directUnitPrice: 8500, components: [], unitPrice: null,
    rate: null, finalUnitPrice: 0, ...changes,
  });
}
const rod: RodQuoteItem = { fishingRodId: "rod-1", fishingRodName: "낚시대", brandName: "브랜드", length: 32, quantity: 3, unitPrice: 100000, rate: .7, finalUnitPrice: 70000 };
function quote(items: QuoteRecord["items"]): QuoteRecord {
  return { id: "quote", title: "혼합 견적", customerName: "고객", note: "", createdBy: "staff", mode: "purchase", items, createdAt: "2026-11-04T00:00:00.000Z", updatedAt: null, revision: 0, totalQuantity: 0, totalPrice: 0 };
}
function groups(): EquipmentOptionGroup[] {
  return [
    { id: "fly", name: "플라이", selection: "single", required: true, choices: [
      { id: "long", label: "롱플라이", purchasePrice: 20000, salePrice: 30000 },
      { id: "half", label: "하프플라이", purchasePrice: 10000, salePrice: 15000 },
    ] },
    { id: "legs", name: "다리", selection: "quantity", required: false, choices: [{ id: "long", label: "롱다리", purchasePrice: 5000, salePrice: 8000 }] },
    { id: "accessories", name: "부속품", selection: "multiple", required: false, choices: [
      { id: "bag", label: "가방", purchasePrice: 2000, salePrice: 3000 },
      { id: "missing", label: "누락품 감액", purchasePrice: -1000, salePrice: -2000 },
    ] },
  ];
}

describe("equipment configuration and templates", () => {
  it("uses editable presets without persisting them and merges templates without overwriting product prices", () => {
    const preset = createEquipmentPreset("tent");
    validateEquipmentCategory(preset);
    assert.deepEqual(preset.optionGroups[0].choices.map(choice => choice.label), ["롱플라이", "하프플라이"]);
    assert.equal(preset.optionGroups[0].selection, "multiple");
    const existing = [{ ...preset.optionGroups[0], name: "개별 구성", choices: [{ ...preset.optionGroups[0].choices[0], purchasePrice: 12345 }] }];
    const merged = mergeEquipmentOptionGroups(existing, preset.optionGroups);
    assert.equal(merged[0].name, "개별 구성");
    assert.equal(merged[0].choices[0].purchasePrice, 12345);
    assert.equal(merged[0].choices.length, 2);
    merged[0].choices[0].purchasePrice = 999;
    assert.equal(existing[0].choices[0].purchasePrice, 12345);
    assert.equal(preset.optionGroups[0].choices[0].purchasePrice, null);
    assert.equal(preset.optionGroups[0].choices[0].salePrice, null);
    assert.ok(createEquipmentPreset("platform").optionGroups.some(group => group.choices.some(choice => choice.label === "파라솔 클램프")));
    validateEquipmentCategory(createEquipmentPreset("stand"));
  });

  it("validates exclusivity, required selections, counts and group-scoped choice IDs", () => {
    const config = groups();
    assert.throws(() => equipmentOptionSnapshots(config, [], "purchase"), /플라이/);
    assert.throws(() => equipmentOptionSnapshots(config, [{ groupId: "fly", choiceId: "long", quantity: 1 }, { groupId: "fly", choiceId: "half", quantity: 1 }], "purchase"), /하나만/);
    assert.throws(() => equipmentOptionSnapshots(config, [{ groupId: "fly", choiceId: "long", quantity: 2 }], "purchase"), /수량 선택/);
    assert.throws(() => equipmentOptionSnapshots(config, [{ groupId: "fly", choiceId: "long", quantity: .5 }], "purchase"), /정수/);
    assert.throws(() => equipmentOptionSnapshots(config, [{ groupId: "missing", choiceId: "long", quantity: 1 }], "purchase"), /등록되지/);
    const selected = equipmentOptionSnapshots(config, [{ groupId: "fly", choiceId: "long", quantity: 1 }, { groupId: "legs", choiceId: "long", quantity: 4 }, { groupId: "accessories", choiceId: "bag", quantity: 1 }, { groupId: "accessories", choiceId: "missing", quantity: 1 }], "purchase");
    assert.equal(selected.length, 4);
    assert.equal(selected[1].quantity, 4);
    assert.equal(selected[3].unitPrice, -1000);
    assert.throws(() => equipmentOptionSnapshots(config, [{ groupId: "fly", choiceId: "long", quantity: 1 }, { groupId: "fly", choiceId: "long", quantity: 1 }], "sale"), /중복/);
    assert.throws(() => validateEquipmentOptionGroups([config[0], { ...config[0] }]), /중복/);
    const safeKeys = [{ ...config[0], id: "__proto__", choices: [{ ...config[0].choices[0], id: "constructor" }] }];
    assert.equal(equipmentOptionSnapshots(safeKeys, [{ groupId: "__proto__", choiceId: "constructor", quantity: 1 }], "purchase")[0].choiceName, "롱플라이");
  });

  it("selects mode-specific prices and snapshots names, quantities and fees independently", () => {
    const config = groups();
    const selection = [{ groupId: "fly", choiceId: "long", quantity: 1 }];
    const purchase = equipmentOptionSnapshots(config, selection, "purchase");
    const sale = equipmentOptionSnapshots(config, selection, "sale");
    assert.equal(purchase[0].unitPrice, 20000);
    assert.equal(sale[0].unitPrice, 30000);
    config[0].name = "변경"; config[0].choices[0].label = "변경"; config[0].choices[0].purchasePrice = 999999;
    assert.deepEqual(purchase[0], { groupId: "fly", groupName: "플라이", choiceId: "long", choiceName: "롱플라이", quantity: 1, unitPrice: 20000 });
    assert.equal(equipmentPriceForMode({ purchasePrice: null, salePrice: 1000 }, "purchase"), null);
    assert.equal(equipmentPriceForMode({ purchasePrice: 500, salePrice: 1000 }, "sale"), 1000);
  });

  it("keeps null and zero catalogue prices distinct and validates arbitrary category templates", () => {
    const category = normalizeEquipmentCategory({ id: "new", name: "새 용품", unit: "세트", optionGroups: groups() });
    validateEquipmentCategory(category);
    const product = normalizeEquipmentProduct({ id: "custom", name: "임의 제품", categoryId: category.id, unit: "세트", purchasePrice: null, salePrice: 0, optionGroups: groups() });
    validateEquipmentProduct(product);
    assert.equal(product.purchasePrice, null); assert.equal(product.salePrice, 0);
    assert.throws(() => validateEquipmentProduct({ ...product, salePrice: -1 }));
  });

  it("stores unknown option amounts separately from zero without accepting invalid values", () => {
    const category = normalizeEquipmentCategory({
      id: "draft", name: "초안", unit: "개", optionGroups: [{
        id: "parts", name: "구성", selection: "multiple", required: false,
        choices: [
          { id: "unknown", label: "미정 부품", purchasePrice: null },
          { id: "blank", label: "빈 금액", purchasePrice: "", salePrice: "  " },
          { id: "included", label: "포함 부품", purchasePrice: 0, salePrice: "0" },
          { id: "deduction", label: "누락 감액", purchasePrice: -5000, salePrice: -10000 },
        ],
      }],
    });
    assert.doesNotThrow(() => validateEquipmentCategory(category));
    const choices = category.optionGroups[0].choices;
    assert.deepEqual(choices.map(choice => [choice.purchasePrice, choice.salePrice]), [[null, null], [null, null], [0, 0], [-5000, -10000]]);
    const invalid = normalizeEquipmentCategory({ ...category, optionGroups: [{ ...category.optionGroups[0], choices: [{ ...choices[0], purchasePrice: "미정" }] }] });
    assert.ok(Number.isNaN(invalid.optionGroups[0].choices[0].purchasePrice));
    assert.throws(() => validateEquipmentCategory(invalid), /가격/);
    assert.throws(() => validateEquipmentOptionGroups([{ ...category.optionGroups[0], choices: [{ ...choices[0], salePrice: Infinity }] }]), /가격/);
  });

  it("requires only selected option prices in the active quote mode and preserves real zero", () => {
    const template: EquipmentOptionGroup[] = [{
      id: "parts", name: "구성", selection: "quantity", required: false,
      choices: [
        { id: "unknown", label: "미정 부품", purchasePrice: null, salePrice: null },
        { id: "sale-only", label: "판매가 부품", purchasePrice: null, salePrice: 5000 },
        { id: "included", label: "기본 포함 부품", purchasePrice: 0, salePrice: 0 },
      ],
    }];
    assert.deepEqual(equipmentOptionSnapshots(template, [], "purchase"), []);
    assert.deepEqual(equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "unknown", quantity: 0 }], "purchase"), []);
    assert.throws(() => equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "unknown", quantity: 1 }], "purchase"), /미정 부품 매입 증감금액/);
    assert.throws(() => equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "unknown", quantity: 1 }], "sale"), /미정 부품 판매 증감금액/);
    assert.throws(() => equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "sale-only", quantity: 2 }], "purchase"), /매입 증감금액/);
    assert.equal(equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "sale-only", quantity: 2 }], "sale")[0].unitPrice, 5000);
    assert.equal(equipmentOptionSnapshots(template, [{ groupId: "parts", choiceId: "included", quantity: 3 }], "purchase")[0].unitPrice, 0);
  });

  it("allows both tent flies after their amounts are entered without repricing catalogue snapshots", () => {
    const template = createEquipmentPreset("tent");
    const selected = [{ groupId: "fly", choiceId: "long", quantity: 1 }, { groupId: "fly", choiceId: "half", quantity: 1 }];
    assert.throws(() => equipmentOptionSnapshots(template.optionGroups, selected, "purchase"), /롱플라이 매입 증감금액/);
    template.optionGroups[0].choices[0].purchasePrice = 10000;
    template.optionGroups[0].choices[1].purchasePrice = 0;
    const snapshots = equipmentOptionSnapshots(template.optionGroups, selected, "purchase");
    assert.deepEqual(snapshots.map(component => [component.choiceName, component.unitPrice]), [["롱플라이", 10000], ["하프플라이", 0]]);
    template.optionGroups[0].choices[0].purchasePrice = null;
    assert.equal(snapshots[0].unitPrice, 10000);
  });
});

describe("mixed quote pricing and historical snapshots", () => {
  it("preserves exact direct prices, adds configured quantities, and rejects negative final totals", () => {
    assert.equal(equipment().finalUnitPrice, 8500);
    const components = equipmentOptionSnapshots(groups(), [{ groupId: "fly", choiceId: "half", quantity: 1 }, { groupId: "legs", choiceId: "long", quantity: 4 }], "purchase");
    const item = equipment({ baseUnitPrice: 100000, directUnitPrice: 85000, components, quantity: 2 });
    assert.equal(item.unitPrice, 130000); assert.equal(item.finalUnitPrice, 115000); assert.equal(item.rate, null);
    assert.equal(quoteSummary([item]).totalPrice, 230000);
    assert.throws(() => equipment({ directUnitPrice: 0, components: [{ ...components[0], unitPrice: -1 }] }));
    assert.throws(() => equipment({ baseUnitPrice: 0, directUnitPrice: 100, components: [{ ...components[0], unitPrice: -1 }] }));
  });

  it("rounds rate equipment to the nearest won while keeping rod thousand-won snapshots unchanged", () => {
    const item = equipment({ pricingMode: "rate", baseUnitPrice: 15900, rate: .65 });
    assert.equal(item.unitPrice, 15900); assert.equal(item.finalUnitPrice, 10335);
    assert.equal(equipment({ pricingMode: "rate", baseUnitPrice: 15901, rate: .65 }).finalUnitPrice, 10336);
    assert.equal(equipment({ pricingMode: "rate", baseUnitPrice: 45, rate: .7 }).finalUnitPrice, 32);
    assert.equal(equipment({ pricingMode: "rate", baseUnitPrice: 50, rate: .29 }).finalUnitPrice, 15);
    assert.throws(() => equipment({ pricingMode: "rate", baseUnitPrice: null, rate: .7 }));
    assert.equal(quoteSummary([rod, item]).totalPrice, 220335);
  });

  it("rounds decimal-percentage half-won boundaries exactly and retains whole-percentage results", () => {
    for (const [base, rate, expected] of [
      [100, .285, 29], [100, .145, 15], [100, .565, 57],
      [100, .2849, 28], [100, .2851, 29],
      [90000, .7, 63000], [100000, .29, 29000], [50000, .56, 28000],
      [45, .7, 32], [10000000, 5e-8, 1], [0, .285, 0], [100, 0, 0],
    ]) {
      assert.equal(equipment({ pricingMode: "rate", baseUnitPrice: base, rate }).finalUnitPrice, expected, `${base} × ${rate}`);
    }
    const components = [{ groupId: "extra", groupName: "추가", choiceId: "part", choiceName: "부품", quantity: 1, unitPrice: 10 }];
    assert.equal(equipment({ pricingMode: "rate", baseUnitPrice: 90, components, rate: .285 }).finalUnitPrice, 29);
  });

  it("includes unknown references in actual money but omits the incomplete original total and average", () => {
    const item = equipment({ quantity: 2 });
    assert.deepEqual(quoteSummary([rod, item]), { totalQuantity: 5, totalOriginalPrice: null, totalPrice: 227000, appliedRate: null });
    assert.equal(quoteSummary([equipment({ baseUnitPrice: 0, directUnitPrice: 0 })]).totalOriginalPrice, 0);
    assert.equal(quoteSummary([equipment({ baseUnitPrice: 0, directUnitPrice: 0 })]).appliedRate, null);
    assert.equal(quoteSummary([equipment({ baseUnitPrice: 10000 })]).appliedRate, .85);
  });

  it("preserves selected equipment mode snapshots when the quote mode or live catalogue changes", () => {
    const components = equipmentOptionSnapshots(groups(), [{ groupId: "fly", choiceId: "half", quantity: 1 }], "purchase");
    const item = equipment({ components });
    const draft = { ...emptyDraft(), equipment: [item] };
    const purchase = quoteItemsFromDraft(draft);
    const sale = quoteItemsFromDraft({ ...draft, mode: "sale" });
    assert.deepEqual(sale, purchase);
    item.components[0].unitPrice = 999999;
    assert.ok(isEquipmentItem(purchase[0]));
    assert.equal(purchase[0].components[0].unitPrice, 10000);
    const restored = normalizeQuoteRecord({ ...quote(purchase), items: [{ ...purchase[0], finalUnitPrice: 12345 }] });
    assert.equal(restored.items[0].finalUnitPrice, 12345);
    assert.doesNotThrow(() => validateQuote(restored));
  });

  it("keeps gear structurally separate from rod lengths and displays mixed units without fake counts", () => {
    const item = equipment();
    assert.ok(!("length" in item));
    assert.equal(quoteItemName(item), "텐트 A"); assert.equal(quoteItemUnit(item), "동");
    assert.equal(quoteItemSpecification(item), "2인용");
    assert.equal(quoteQuantityLabel([rod, item, equipment({ id: "stand", unit: "세트", quantity: 2 })]), "3대 · 1동 · 2세트");
    const grouped = groupQuoteItems([rod, item, { ...item, id: "tent-line-2", quantity: 2 }]);
    assert.equal(grouped.length, 2); assert.equal(grouped[1].kind, "equipment"); assert.equal(grouped[1].categoryName, "텐트");
    assert.equal(grouped[1].totalQuantity, 3); assert.equal(grouped[1].items[0], item);
    const copy = buildQuoteText(quote([rod, item]));
    assert.ok(copy.includes("총 수량: 3대 · 1동")); assert.ok(copy.includes("총 가격: —"));
    assert.ok(copy.includes("평균 적용율: —")); assert.equal(copy.split("칸수 범위:").length - 1, 1);
    const legacy = normalizeQuoteRecord(quote([rod]) as unknown as Record<string, unknown>);
    assert.ok(!isEquipmentItem(legacy.items[0])); assert.equal(legacy.items[0].length, 32);
  });
});
