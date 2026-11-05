import { formatAppliedRate, formatLengthRange, formatMoney } from "./format";
import { normalizeEquipmentQuoteItem, validateEquipmentQuoteItem } from "./equipment";
import { normalizeBrandAliases } from "./brands";

export type CalculationMode = "purchase" | "sale";
export type PriceMap = Record<string, number>;

export interface Brand {
  id: string;
  name: string;
  aliases?: string[];
  /** Retained duplicate document; existing product references resolve to this brand. */
  mergedInto?: string | null;
  /** Keeps legacy product links usable in active-brand backups as well. */
  mergedBrandIds?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FishingRod {
  id: string;
  name: string;
  brandId: string;
  minValue: number;
  maxValue: number;
  usedPrice: number;
  lengthPrices: PriceMap;
  purchaseLengthPrices: PriceMap;
  saleLengthPrices: PriceMap;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CalculationItem {
  fishingRodId: string;
  length: number;
  quantity: number;
  discountRate: number;
  saleRate: number;
}

export interface RodQuoteItem {
  kind?: "rod";
  fishingRodId: string;
  fishingRodName: string;
  brandName: string;
  length: number;
  quantity: number;
  unitPrice: number;
  rate: number;
  finalUnitPrice: number;
}

export interface EquipmentComponentSnapshot {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  quantity: number;
  unitPrice: number;
}

export interface EquipmentQuoteItem {
  kind: "equipment";
  id: string;
  categoryId: string;
  categoryName: string;
  productId: string | null;
  productName: string;
  brandName: string;
  specification: string;
  unit: string;
  quantity: number;
  pricingMode: "direct" | "rate";
  baseUnitPrice: number | null;
  directUnitPrice: number;
  components: EquipmentComponentSnapshot[];
  unitPrice: number | null;
  rate: number | null;
  finalUnitPrice: number;
}

export type QuoteItem = RodQuoteItem | EquipmentQuoteItem;

export interface QuoteSummary {
  totalQuantity: number;
  totalPrice: number;
  totalOriginalPrice: number | null;
  appliedRate: number | null;
}

export interface QuoteItemGroup extends QuoteSummary {
  key: string;
  kind: "rod" | "equipment";
  name: string;
  unit: string;
  categoryName: string;
  fishingRodId: string;
  fishingRodName: string;
  brandName: string;
  items: QuoteItem[];
}

export interface QuoteRecord {
  id: string;
  title: string;
  note: string;
  customerName: string;
  createdBy: string;
  mode: CalculationMode;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string | null;
  revision: number;
  totalQuantity: number;
  totalPrice: number;
}

export interface QuoteDraftRod {
  rod: FishingRod;
  brandName: string;
  calculations: CalculationItem[];
}

export interface QuoteDraft {
  customerName: string;
  note: string;
  mode: CalculationMode;
  rods: QuoteDraftRod[];
  equipment: EquipmentQuoteItem[];
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numeric(value: unknown, fallback = 0): number {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function normalizePriceMap(value: unknown): PriceMap {
  const result: PriceMap = {};
  for (const [key, price] of Object.entries(object(value))) {
    if (!/^[+-]?\d+$/.test(key.trim())) continue;
    const length = Number(key);
    const amount = numeric(price, Number.NaN);
    if (Number.isSafeInteger(length) && Number.isFinite(amount)) {
      result[String(length)] = amount;
    }
  }
  return result;
}

function hasPrices(prices: PriceMap): boolean {
  return Object.keys(prices).length > 0;
}

function average(prices: PriceMap): number {
  const values = Object.values(prices);
  return values.length === 0
    ? 0
    : values.reduce((total, price) => total + price, 0) / values.length;
}

/** Accepts existing JSON dates and Firestore timestamps without an SDK import. */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string" || typeof value === "number") {
      date = new Date(value);
    } else {
      const raw = object(value);
      if (typeof raw.toDate === "function") {
        return normalizeDate(raw.toDate.call(value));
      }
      // Also accepts timestamp objects from serialized Firestore exports.
      const seconds = raw.seconds ?? raw._seconds;
      const nanoseconds = raw.nanoseconds ?? raw._nanoseconds ?? 0;
      if (typeof seconds !== "number" || typeof nanoseconds !== "number") {
        return null;
      }
      date = new Date(seconds * 1000 + nanoseconds / 1_000_000);
    }
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

export function normalizeBrand(
  raw: Record<string, unknown>,
  id?: string,
): Brand {
  return {
    id: id ?? text(raw.id),
    name: text(raw.name),
    aliases: normalizeBrandAliases(text(raw.name), raw.aliases),
    ...(text(raw.mergedInto).trim() ? { mergedInto: text(raw.mergedInto).trim() } : {}),
    ...(Array.isArray(raw.mergedBrandIds) ? { mergedBrandIds: [...new Set(raw.mergedBrandIds.filter((value): value is string => typeof value === "string" && !!value && !value.includes("/") && value !== (id ?? text(raw.id))))] } : {}),
    createdAt: normalizeDate(raw.createdAt),
    updatedAt: normalizeDate(raw.updatedAt),
  };
}

/** Retains legacy price maps while resolving the newer purchase/sale fields. */
export function normalizeFishingRod(
  raw: Record<string, unknown>,
  id?: string,
): FishingRod {
  const legacy = normalizePriceMap(raw.lengthPrices);
  const purchase = normalizePriceMap(raw.purchaseLengthPrices ?? raw.purchasePrices);
  const sale = normalizePriceMap(raw.saleLengthPrices ?? raw.salePrices);
  const purchasePrices = hasPrices(purchase) ? purchase : legacy;
  const salePrices = hasPrices(sale)
    ? sale
    : hasPrices(legacy)
      ? legacy
      : purchasePrices;
  return {
    id: id ?? text(raw.id),
    name: text(raw.name),
    brandId: text(raw.brandId),
    minValue: numeric(raw.minValue, 18),
    maxValue: numeric(raw.maxValue, 60),
    usedPrice: numeric(raw.usedPrice, average(hasPrices(salePrices) ? salePrices : purchasePrices)),
    lengthPrices: { ...(hasPrices(legacy) ? legacy : salePrices) },
    purchaseLengthPrices: { ...purchasePrices },
    saleLengthPrices: { ...salePrices },
    createdAt: normalizeDate(raw.createdAt),
    updatedAt: normalizeDate(raw.updatedAt),
  };
}

export function availableLengths(rod: FishingRod): number[] {
  const lengths = new Set(
    [rod.lengthPrices, rod.purchaseLengthPrices, rod.saleLengthPrices].flatMap(
      (prices) => Object.keys(prices).map(Number),
    ),
  );
  if (lengths.size > 0) return [...lengths].sort((a, b) => a - b);
  const result: number[] = [];
  for (let length = rod.minValue; length <= rod.maxValue; length += 2) {
    result.push(length);
  }
  return result;
}

export function priceForLength(
  rod: FishingRod,
  length: number,
  mode: CalculationMode,
): number {
  const key = String(length);
  return mode === "purchase"
    ? (rod.purchaseLengthPrices[key] ?? rod.lengthPrices[key] ?? rod.saleLengthPrices[key] ?? rod.usedPrice)
    : (rod.saleLengthPrices[key] ?? rod.lengthPrices[key] ?? rod.purchaseLengthPrices[key] ?? rod.usedPrice);
}

export function modeLabel(mode: CalculationMode): string {
  return mode === "purchase" ? "매입" : "판매";
}

export function rateForMode(item: CalculationItem, mode: CalculationMode): number {
  return mode === "purchase" ? item.discountRate : item.saleRate;
}

/** Round each unit before quantity is applied; matches the existing calculator. */
export function adjustedUnitPrice(
  base: number,
  rate: number,
  mode: CalculationMode,
): number {
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError("가격은 0 이상, 적용율은 0~100%여야 합니다.");
  }
  const percent = Math.round(rate * 100);
  // Multiply whole percentages as integers so 90,000 × 70% stays exactly 63,000.
  // Keep fractional legacy rates intact instead of rounding them to a whole percent.
  const amount = rate === percent / 100
    ? (base * percent) / 100_000
    : (base * rate) / 1000;
  return (mode === "purchase" ? Math.floor(amount) : Math.ceil(amount)) * 1000;
}

export function quoteItemsFromDraft(draft: QuoteDraft): QuoteItem[] {
  const rods: RodQuoteItem[] = draft.rods.flatMap((group) =>
    group.calculations.filter((calculation) => calculation.quantity > 0).map((calculation) => {
      const unitPrice = priceForLength(group.rod, calculation.length, draft.mode);
      const rate = rateForMode(calculation, draft.mode);
      return {
        fishingRodId: group.rod.id,
        fishingRodName: group.rod.name,
        brandName: group.brandName,
        length: calculation.length,
        quantity: calculation.quantity,
        unitPrice,
        rate,
        finalUnitPrice: adjustedUnitPrice(unitPrice, rate, draft.mode),
      };
    }),
  );
  return [...rods, ...(draft.equipment ?? []).map(item => ({ ...item, components: item.components.map(component => ({ ...component })) }))];
}

export function quoteTotals(items: QuoteItem[]): {
  totalQuantity: number;
  totalPrice: number;
  totalOriginalPrice: number | null;
} {
  return items.reduce<{ totalQuantity: number; totalPrice: number; totalOriginalPrice: number | null }>(
    (totals, item) => ({
      totalQuantity: totals.totalQuantity + item.quantity,
      totalPrice: totals.totalPrice + item.finalUnitPrice * item.quantity,
      totalOriginalPrice: totals.totalOriginalPrice === null || item.unitPrice === null
        ? null : totals.totalOriginalPrice + item.unitPrice * item.quantity,
    }),
    { totalQuantity: 0, totalPrice: 0, totalOriginalPrice: 0 },
  );
}

/** Uses saved unit-price snapshots, including their per-unit rounding. */
export function quoteSummary(items: QuoteItem[]): QuoteSummary {
  const totals = quoteTotals(items);
  return {
    ...totals,
    appliedRate: totals.totalOriginalPrice === null || totals.totalOriginalPrice === 0
      ? null
      : totals.totalPrice / totals.totalOriginalPrice,
  };
}

/** Keep the first appearance of each rod snapshot and each item's order. */
export function groupQuoteItems(items: QuoteItem[]): QuoteItemGroup[] {
  const groups = new Map<string, Omit<QuoteItemGroup, keyof QuoteSummary>>();
  for (const item of items) {
    const equipment = isEquipmentItem(item);
    const itemName = quoteItemName(item);
    const itemId = equipment ? item.productId ?? item.id : item.fishingRodId;
    const key = JSON.stringify(equipment
      ? ["equipment", item.categoryId, item.categoryName, itemId, item.brandName, itemName, item.unit]
      : itemId ? ["id", itemId, item.brandName, itemName] : ["snapshot", item.brandName, itemName]);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind: equipment ? "equipment" : "rod",
        name: itemName,
        unit: quoteItemUnit(item),
        categoryName: equipment ? item.categoryName : "낚시대",
        fishingRodId: itemId,
        fishingRodName: itemName,
        brandName: item.brandName,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()].map((group) => ({ ...group, ...quoteSummary(group.items) }));
}

export function isEquipmentItem(item: QuoteItem): item is EquipmentQuoteItem {
  return item.kind === "equipment";
}
export function quoteItemName(item: QuoteItem): string {
  return isEquipmentItem(item) ? item.productName : item.fishingRodName;
}
export function quoteItemUnit(item: QuoteItem): string {
  return isEquipmentItem(item) ? item.unit : "대";
}
export function quoteItemSpecification(item: QuoteItem): string {
  if (!isEquipmentItem(item)) return `${item.length}칸`;
  return [item.specification, ...item.components.map(component => `${component.groupName}: ${component.choiceName}${component.quantity > 1 ? ` ×${component.quantity}` : ""}`)].filter(Boolean).join(" · ");
}
export function quoteQuantityLabel(items: QuoteItem[]): string {
  const units = new Map<string, number>();
  for (const item of items) {
    const unit = quoteItemUnit(item);
    units.set(unit, (units.get(unit) ?? 0) + item.quantity);
  }
  return [...units].map(([unit, quantity]) => `${quantity}${unit}`).join(" · ") || "0개";
}

export function normalizeQuoteRecord(
  raw: Record<string, unknown>,
  id?: string,
): QuoteRecord {
  const createdAt = normalizeDate(raw.createdAt) ?? normalizeDate(raw.clientCreatedAt);
  if (!createdAt) throw new Error("견적의 기록 시간이 올바르지 않습니다.");
  if (raw.mode !== "purchase" && raw.mode !== "sale") {
    throw new Error("견적 구분이 올바르지 않습니다.");
  }
  if (!Array.isArray(raw.items)) throw new Error("견적 항목이 올바르지 않습니다.");
  const items = raw.items.map((value): QuoteItem => {
    const item = object(value);
    if (item.kind === "equipment") return normalizeEquipmentQuoteItem(item);
    if (item.kind !== undefined && item.kind !== "rod") throw new Error("견적 품목 종류가 올바르지 않습니다.");
    return {
      fishingRodId: text(item.fishingRodId),
      fishingRodName: text(item.fishingRodName),
      brandName: text(item.brandName),
      length: numeric(item.length),
      quantity: numeric(item.quantity),
      unitPrice: numeric(item.unitPrice),
      rate: numeric(item.rate),
      // Historical prices must never be recomputed from the current catalogue.
      finalUnitPrice: numeric(item.finalUnitPrice),
    };
  });
  const totals = quoteTotals(items);
  return {
    id: id ?? text(raw.id),
    title: text(raw.title),
    note: text(raw.note),
    customerName: text(raw.customerName),
    createdBy: text(raw.createdBy),
    mode: raw.mode,
    items,
    createdAt,
    updatedAt: normalizeDate(raw.updatedAt) ?? normalizeDate(raw.clientUpdatedAt),
    revision: numeric(raw.revision),
    totalQuantity: totals.totalQuantity,
    totalPrice: totals.totalPrice,
  };
}

export function emptyDraft(): QuoteDraft {
  return { customerName: "", note: "", mode: "purchase", rods: [], equipment: [] };
}

export function upsertDraftRod(draft: QuoteDraft, group: QuoteDraftRod): QuoteDraft {
  const calculations = group.calculations
    .filter((calculation) => calculation.quantity > 0)
    .map((calculation) => ({ ...calculation, fishingRodId: group.rod.id }));
  if (calculations.length === 0) return removeDraftRod(draft, group.rod.id);
  const rod = {
    ...group.rod,
    lengthPrices: { ...group.rod.lengthPrices },
    purchaseLengthPrices: { ...group.rod.purchaseLengthPrices },
    saleLengthPrices: { ...group.rod.saleLengthPrices },
  };
  const updated = { rod, brandName: group.brandName, calculations };
  const index = draft.rods.findIndex((existing) => existing.rod.id === rod.id);
  const rods = [...draft.rods];
  if (index < 0) rods.push(updated);
  else rods[index] = updated;
  return { ...draft, rods };
}

export function removeDraftRod(draft: QuoteDraft, id: string): QuoteDraft {
  return { ...draft, rods: draft.rods.filter((group) => group.rod.id !== id) };
}

export function validateQuote(
  input: Pick<QuoteRecord, "title" | "note" | "customerName" | "items">,
): void {
  if (!input.title.trim() || input.title.trim().length > 120) {
    throw new Error("견적 제목을 1~120자로 입력해주세요.");
  }
  if (input.note.trim().length > 4000) throw new Error("메모는 4,000자 이내로 입력해주세요.");
  if (input.customerName.trim().length > 120) throw new Error("고객명은 120자 이내로 입력해주세요.");
  if (input.items.length === 0 || input.items.length > 500) {
    throw new Error("견적 항목을 1~500개 입력해주세요.");
  }
  for (const item of input.items) {
    if (isEquipmentItem(item)) { validateEquipmentQuoteItem(item); continue; }
    if (!item.fishingRodName.trim() || !Number.isSafeInteger(item.length) || item.length <= 0 ||
      !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isFinite(item.unitPrice) || item.unitPrice < 0 ||
      !Number.isFinite(item.rate) || item.rate < 0 || item.rate > 1 ||
      !Number.isFinite(item.finalUnitPrice) || item.finalUnitPrice < 0 ||
      !Number.isFinite(item.finalUnitPrice * item.quantity)) {
      throw new Error("낚시대명, 칸수, 수량, 가격과 적용율을 확인해주세요.");
    }
  }
  const totals = quoteTotals(input.items);
  if (!Number.isSafeInteger(totals.totalQuantity) || !Number.isFinite(totals.totalPrice) || totals.totalOriginalPrice !== null && !Number.isFinite(totals.totalOriginalPrice)) {
    throw new Error("견적 수량과 합계가 너무 큽니다.");
  }
}

export function buildQuoteText(record: QuoteRecord): string {
  const priceLabel = record.mode === "purchase" ? "총 매입가격" : "총 판매가격";
  const money = (value: number | null) => value === null ? "—" : formatMoney(value);
  const summaryLines = (summary: QuoteSummary) => [
    `총 가격: ${money(summary.totalOriginalPrice)}`,
    `평균 적용율: ${formatAppliedRate(summary.appliedRate)}`,
    `${priceLabel}: ${formatMoney(summary.totalPrice)}`,
  ];
  const lines = [record.title, `${modeLabel(record.mode)} 견적`];
  if (record.customerName) lines.push(`고객: ${record.customerName}`);
  for (const group of groupQuoteItems(record.items)) {
    lines.push("", `${group.brandName ? `[${group.brandName}] ` : ""}${group.fishingRodName}`);
    for (const item of group.items) {
      lines.push(`${quoteItemSpecification(item) || "본품"} · ${item.quantity}${quoteItemUnit(item)} · 기준 단가 ${money(item.unitPrice)} · 최종 단가 ${formatMoney(item.finalUnitPrice)} · 합계 ${formatMoney(item.finalUnitPrice * item.quantity)}`);
    }
    if (group.kind === "rod") lines.push(`칸수 범위: ${formatLengthRange(group.items.filter((item): item is RodQuoteItem => !isEquipmentItem(item)).map(item => item.length))}`);
    lines.push(`${group.kind === "rod" ? "총 대수" : "총 수량"}: ${quoteQuantityLabel(group.items)}`, ...summaryLines(group));
  }
  const summary = quoteSummary(record.items);
  lines.push("", "전체 합계", `${record.items.some(isEquipmentItem) ? "총 수량" : "총 대수"}: ${quoteQuantityLabel(record.items)}`, ...summaryLines(summary), `총 견적 금액: ${formatMoney(summary.totalPrice)}`);
  lines.push("", "평균 적용율은 저장된 최종 금액 ÷ 총 가격으로 계산합니다.");
  if (record.note) lines.push("", `메모: ${record.note}`);
  return lines.join("\n");
}
