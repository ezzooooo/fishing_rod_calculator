import type { CalculationMode, EquipmentComponentSnapshot, EquipmentQuoteItem } from "./domain";

export interface EquipmentOptionChoice { id: string; label: string; purchasePrice: number | null; salePrice: number | null }
export interface EquipmentOptionGroup {
  id: string; name: string; selection: "single" | "multiple" | "quantity"; required: boolean; choices: EquipmentOptionChoice[];
}
export interface EquipmentCategory {
  id: string; name: string; unit: string; optionGroups: EquipmentOptionGroup[]; createdAt?: string | null; updatedAt?: string | null;
}
export interface EquipmentProduct {
  id: string; name: string; categoryId: string; brandId: string; specification: string; unit: string;
  purchasePrice: number | null; salePrice: number | null; optionGroups: EquipmentOptionGroup[];
  createdAt?: string | null; updatedAt?: string | null;
}
export interface EquipmentSelection { groupId: string; choiceId: string; quantity: number }

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const text = (value: unknown) => typeof value === "string" ? value : "";
const amount = (value: unknown) => typeof value === "number" || typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
const nullableAmount = (value: unknown) => value === null || value === undefined || typeof value === "string" && value.trim() === "" ? null : amount(value);
function name(value: string, label = "이름", limit = 120) {
  if (!value.trim() || value.trim().length > limit) throw new Error(`${label}을 1~${limit}자로 입력해주세요.`);
}
function price(value: number | null, nullable = false, signed = false) {
  if (value === null && nullable) return;
  if (value === null || !Number.isFinite(value) || !signed && value < 0) throw new Error("가격을 올바른 숫자로 입력해주세요.");
}
function positiveQuantity(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("수량은 1 이상의 정수로 입력해주세요.");
}

export function cloneEquipmentOptionGroups(groups: EquipmentOptionGroup[]): EquipmentOptionGroup[] {
  return groups.map(group => ({ ...group, choices: group.choices.map(choice => ({ ...choice })) }));
}

export function validateEquipmentOptionGroups(groups: EquipmentOptionGroup[]): void {
  if (!Array.isArray(groups) || groups.length > 30) throw new Error("구성 그룹은 30개까지 입력해주세요.");
  const groupIds = new Set<string>();
  for (const group of groups) {
    name(group.id, "구성 그룹 ID"); name(group.name, "구성 그룹명");
    if (groupIds.has(group.id)) throw new Error("중복된 구성 그룹 ID가 있습니다.");
    groupIds.add(group.id);
    if (!["single", "multiple", "quantity"].includes(group.selection) || typeof group.required !== "boolean") throw new Error("구성 선택 방식을 확인해주세요.");
    if (!Array.isArray(group.choices) || group.choices.length === 0 || group.choices.length > 100) throw new Error("구성 선택지를 1~100개 입력해주세요.");
    const choiceIds = new Set<string>();
    for (const choice of group.choices) {
      name(choice.id, "선택지 ID"); name(choice.label, "선택지 이름");
      if (choiceIds.has(choice.id)) throw new Error("그룹 안에 중복된 선택지 ID가 있습니다.");
      choiceIds.add(choice.id); price(choice.purchasePrice, true, true); price(choice.salePrice, true, true);
    }
  }
}

function normalizeGroups(value: unknown): EquipmentOptionGroup[] {
  return (Array.isArray(value) ? value : []).map(value => {
    const raw = object(value);
    return {
      id: text(raw.id), name: text(raw.name), selection: text(raw.selection) as EquipmentOptionGroup["selection"], required: raw.required === true,
      choices: (Array.isArray(raw.choices) ? raw.choices : []).map(value => {
        const choice = object(value);
        return { id: text(choice.id), label: text(choice.label), purchasePrice: nullableAmount(choice.purchasePrice), salePrice: nullableAmount(choice.salePrice) };
      }),
    };
  });
}
export function normalizeEquipmentCategory(raw: Record<string, unknown>, id?: string): EquipmentCategory {
  return { id: id ?? text(raw.id), name: text(raw.name), unit: text(raw.unit) || "개", optionGroups: normalizeGroups(raw.optionGroups), createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null };
}
export function normalizeEquipmentProduct(raw: Record<string, unknown>, id?: string): EquipmentProduct {
  return {
    id: id ?? text(raw.id), name: text(raw.name), categoryId: text(raw.categoryId), brandId: text(raw.brandId), specification: text(raw.specification),
    unit: text(raw.unit) || "개", purchasePrice: nullableAmount(raw.purchasePrice), salePrice: nullableAmount(raw.salePrice), optionGroups: normalizeGroups(raw.optionGroups),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}
export function validateEquipmentCategory(category: EquipmentCategory): void {
  name(category.id, "종류 ID"); name(category.name, "종류 이름"); name(category.unit, "수량 단위", 20);
  validateEquipmentOptionGroups(category.optionGroups);
}
export function validateEquipmentProduct(product: EquipmentProduct): void {
  name(product.id, "제품 ID"); name(product.name, "제품 이름"); name(product.categoryId, "종류"); name(product.unit, "수량 단위", 20);
  if (product.brandId.length > 120 || product.specification.length > 500) throw new Error("브랜드 또는 규격이 너무 깁니다.");
  price(product.purchasePrice, true); price(product.salePrice, true); validateEquipmentOptionGroups(product.optionGroups);
}

/** Explicit template import: retain all product edits and append only missing IDs. */
export function mergeEquipmentOptionGroups(existing: EquipmentOptionGroup[], templates: EquipmentOptionGroup[]): EquipmentOptionGroup[] {
  const merged = cloneEquipmentOptionGroups(existing);
  for (const template of cloneEquipmentOptionGroups(templates)) {
    const group = merged.find(value => value.id === template.id);
    if (!group) merged.push(template);
    else for (const choice of template.choices) if (!group.choices.some(value => value.id === choice.id)) group.choices.push(choice);
  }
  return merged;
}

export function createEquipmentPreset(kind: "tent" | "platform" | "stand"): EquipmentCategory {
  const choice = (id: string, label: string): EquipmentOptionChoice => ({ id, label, purchasePrice: null, salePrice: null });
  const definitions: Record<typeof kind, Omit<EquipmentCategory, "id">> = {
    tent: { name: "텐트", unit: "동", optionGroups: [{ id: "fly", name: "플라이", selection: "multiple", required: false, choices: [choice("long", "롱플라이"), choice("half", "하프플라이")] }] },
    platform: { name: "좌대", unit: "개", optionGroups: [
      { id: "legs", name: "다리 구성", selection: "quantity", required: false, choices: [choice("short", "숏다리"), choice("long", "롱다리")] },
      { id: "accessories", name: "추가 구성", selection: "multiple", required: false, choices: [choice("frame", "전투좌대 프레임"), choice("tent-bracket", "텐트 브라켓"), choice("parasol-clamp", "파라솔 클램프")] },
    ] },
    stand: { name: "받침틀", unit: "세트", optionGroups: [
      { id: "configuration", name: "구성", selection: "multiple", required: false, choices: [choice("head", "받침머리"), choice("bag", "가방")] },
      { id: "holders", name: "받침대", selection: "quantity", required: false, choices: [choice("holder", "받침대")] },
    ] },
  };
  return { id: crypto.randomUUID(), ...definitions[kind] };
}

export function equipmentPriceForMode(value: { purchasePrice: number | null; salePrice: number | null }, mode: CalculationMode): number | null {
  return mode === "purchase" ? value.purchasePrice : value.salePrice;
}

export function equipmentOptionSnapshots(groups: EquipmentOptionGroup[], selections: EquipmentSelection[], mode: CalculationMode): EquipmentComponentSnapshot[] {
  validateEquipmentOptionGroups(groups);
  const groupMap = new Map(groups.map(group => [group.id, group]));
  const seen = new Map<string, Set<string>>();
  const result: EquipmentComponentSnapshot[] = [];
  for (const selection of selections) {
    if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 0) throw new Error("구성 수량은 0 이상의 정수로 입력해주세요.");
    const group = groupMap.get(selection.groupId);
    const choice = group?.choices.find(value => value.id === selection.choiceId);
    if (!group || !choice) throw new Error("등록되지 않은 구성 선택지가 있습니다.");
    const selected = seen.get(group.id) ?? new Set<string>();
    if (selected.has(choice.id)) throw new Error("중복된 구성 선택지가 있습니다.");
    selected.add(choice.id); seen.set(group.id, selected);
    if (selection.quantity === 0) continue;
    if (group.selection !== "quantity" && selection.quantity !== 1) throw new Error("수량 선택 그룹만 여러 개를 선택할 수 있습니다.");
    if (group.selection === "single" && result.some(value => value.groupId === group.id)) throw new Error("이 구성 그룹에서는 하나만 선택해주세요.");
    const unitPrice = equipmentPriceForMode(choice, mode);
    if (unitPrice === null) throw new Error(`${choice.label} ${mode === "purchase" ? "매입" : "판매"} 증감금액을 입력해주세요.`);
    result.push({ groupId: group.id, groupName: group.name, choiceId: choice.id, choiceName: choice.label, quantity: selection.quantity, unitPrice });
  }
  for (const group of groups) if (group.required && !result.some(value => value.groupId === group.id)) throw new Error(`${group.name} 구성을 선택해주세요.`);
  return result;
}

export function cloneEquipmentItem(item: EquipmentQuoteItem): EquipmentQuoteItem {
  return { ...item, components: item.components.map(component => ({ ...component })) };
}
export function validateEquipmentQuoteItem(item: EquipmentQuoteItem): void {
  name(item.id, "항목 ID"); name(item.categoryId, "종류 ID"); name(item.categoryName, "종류 이름"); name(item.productName, "제품 이름"); name(item.unit, "수량 단위", 20);
  if (item.productId !== null) name(item.productId, "제품 ID");
  if (item.brandName.length > 120 || item.specification.length > 500) throw new Error("브랜드 또는 규격이 너무 깁니다.");
  positiveQuantity(item.quantity); price(item.baseUnitPrice, true); price(item.directUnitPrice); price(item.unitPrice, true); price(item.finalUnitPrice);
  if (!Array.isArray(item.components) || item.components.length > 300) throw new Error("구성 항목은 300개까지 입력해주세요.");
  const keys = new Set<string>();
  for (const component of item.components) {
    name(component.groupId, "구성 그룹 ID"); name(component.groupName, "구성 그룹명"); name(component.choiceId, "선택지 ID"); name(component.choiceName, "선택지 이름");
    positiveQuantity(component.quantity); price(component.unitPrice, false, true);
    const key = JSON.stringify([component.groupId, component.choiceId]);
    if (keys.has(key)) throw new Error("중복된 구성 선택지가 있습니다.");
    keys.add(key);
  }
  if (item.pricingMode === "rate") {
    if (item.baseUnitPrice === null || item.unitPrice === null || item.rate === null || !Number.isFinite(item.rate) || item.rate < 0 || item.rate > 1) throw new Error("비율 계산에는 기준가와 0~100% 적용율이 필요합니다.");
  } else if (item.pricingMode !== "direct" || item.rate !== null) throw new Error("용품 계산 방식을 확인해주세요.");
  if (!Number.isFinite(item.finalUnitPrice * item.quantity)) throw new Error("용품 금액이 너무 큽니다.");
}

/** Multiply decimal input values exactly, then round a half won upward. */
function roundedRatePrice(reference: number, rate: number): number {
  if (!Number.isFinite(reference) || reference < 0 || !Number.isFinite(rate) || rate < 0 || rate > 1) return Number.NaN;
  const decimal = (value: number) => {
    const [coefficient, exponent = "0"] = value.toString().toLowerCase().split("e");
    const [whole, fraction = ""] = coefficient.split(".");
    const scale = fraction.length - Number(exponent);
    const digits = BigInt(whole + fraction);
    return scale < 0
      ? { digits: digits * BigInt(10) ** BigInt(-scale), scale: 0 }
      : { digits, scale };
  };
  const base = decimal(reference);
  const ratio = decimal(rate);
  const numerator = base.digits * ratio.digits;
  const denominator = BigInt(10) ** BigInt(base.scale + ratio.scale);
  const wholeWon = numerator / denominator;
  const roundUp = numerator % denominator * BigInt(2) >= denominator;
  return Number(wholeWon + (roundUp ? BigInt(1) : BigInt(0)));
}

export function calculateEquipmentQuoteItem(input: EquipmentQuoteItem): EquipmentQuoteItem {
  const item = cloneEquipmentItem(input);
  const extras = item.components.reduce((sum, component) => sum + component.quantity * component.unitPrice, 0);
  item.unitPrice = item.baseUnitPrice === null ? null : item.baseUnitPrice + extras;
  item.rate = item.pricingMode === "direct" ? null : item.rate;
  const reference = item.unitPrice ?? Number.NaN;
  const rate = item.rate ?? Number.NaN;
  item.finalUnitPrice = item.pricingMode === "direct" ? item.directUnitPrice + extras : roundedRatePrice(reference, rate);
  validateEquipmentQuoteItem(item);
  return item;
}

/** Saved final prices are snapshots: normalization never recalculates them. */
export function normalizeEquipmentQuoteItem(raw: Record<string, unknown>): EquipmentQuoteItem {
  return {
    kind: "equipment", id: text(raw.id), categoryId: text(raw.categoryId), categoryName: text(raw.categoryName), productId: raw.productId === null || raw.productId === undefined ? null : text(raw.productId),
    productName: text(raw.productName), brandName: text(raw.brandName), specification: text(raw.specification), unit: text(raw.unit) || "개", quantity: amount(raw.quantity),
    pricingMode: text(raw.pricingMode) as EquipmentQuoteItem["pricingMode"], baseUnitPrice: nullableAmount(raw.baseUnitPrice), directUnitPrice: amount(raw.directUnitPrice),
    components: (Array.isArray(raw.components) ? raw.components : []).map(value => {
      const component = object(value);
      return { groupId: text(component.groupId), groupName: text(component.groupName), choiceId: text(component.choiceId), choiceName: text(component.choiceName), quantity: amount(component.quantity), unitPrice: amount(component.unitPrice) };
    }),
    unitPrice: nullableAmount(raw.unitPrice), rate: nullableAmount(raw.rate), finalUnitPrice: amount(raw.finalUnitPrice),
  };
}
