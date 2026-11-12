import { adjustedUnitPrice, availableLengths, groupQuoteItems, isEquipmentItem, priceForLength, validateQuote, type CalculationMode, type FishingRod, type QuoteItem, type RodQuoteItem } from "./domain";
import { cloneEquipmentItem } from "./equipment";

const cloneItem = (item: QuoteItem): QuoteItem => isEquipmentItem(item) ? cloneEquipmentItem(item) : { ...item };

function rodSnapshotKey(item: RodQuoteItem): string | null {
  if (!item.fishingRodId.trim()) return null;
  return JSON.stringify([
    item.fishingRodId, item.fishingRodName, item.brandName, item.length,
    item.unitPrice, item.rate, item.finalUnitPrice,
  ]);
}

function validateItems(items: QuoteItem[]) {
  validateQuote({ title: "견적 항목 추가", customerName: "", note: "", items });
}

/** Add new selections without recalculating any saved price snapshot. */
export function appendQuoteItems(existing: readonly QuoteItem[], additions: readonly QuoteItem[]): QuoteItem[] {
  if (existing.length) validateItems([...existing]);
  const items = existing.map(cloneItem);
  const matchingRods = new Map<string, number>();
  items.forEach((item, index) => {
    if (isEquipmentItem(item)) return;
    const key = rodSnapshotKey(item);
    if (key !== null && !matchingRods.has(key)) matchingRods.set(key, index);
  });

  for (const addition of additions) {
    // Validate before merging, so invalid new quantities cannot hide inside a valid total.
    validateItems([addition]);
    const key = isEquipmentItem(addition) ? null : rodSnapshotKey(addition);
    const matchingIndex = key === null ? undefined : matchingRods.get(key);
    if (matchingIndex !== undefined) {
      const previous = items[matchingIndex];
      const quantity = previous.quantity + addition.quantity;
      if (!Number.isSafeInteger(quantity)) throw new Error("합산한 견적 수량이 너무 큽니다.");
      items[matchingIndex] = { ...previous, quantity };
    } else {
      if (items.length >= 500) throw new Error("견적 항목은 최대 500개까지 추가할 수 있습니다.");
      if (key !== null) matchingRods.set(key, items.length);
      items.push(cloneItem(addition));
    }
  }
  validateItems(items);
  return items;
}

export interface SavedRodGroupEditRow {
  readonly key: string;
  /** Global quote index. Each historical row remains independent, including repeated lengths. */
  readonly sourceIndex: number | null;
  readonly item: Readonly<RodQuoteItem>;
}

export interface SavedRodGroupEditor {
  readonly groupKey: string;
  readonly mode: CalculationMode;
  readonly rows: readonly SavedRodGroupEditRow[];
}

export interface SavedRodGroupChange {
  key: string;
  quantity: number;
  rate: number;
}

function savedRodGroup(items: readonly QuoteItem[], groupKey: string) {
  const group = groupQuoteItems([...items]).find(value => value.key === groupKey && value.kind === "rod");
  if (!group) throw new Error("수정할 낚시대를 찾을 수 없습니다. 견적을 다시 확인해주세요.");
  return group;
}

function savedRodSnapshot(item: Readonly<RodQuoteItem>) {
  return JSON.stringify([item.kind, item.fishingRodId, item.fishingRodName, item.brandName,
    item.length, item.quantity, item.unitPrice, item.rate, item.finalUnitPrice]);
}

/** Capture saved rows and only the missing lengths from the current catalogue. */
export function createSavedRodGroupEditor(
  items: readonly QuoteItem[], groupKey: string, mode: CalculationMode, catalogRod?: FishingRod,
): SavedRodGroupEditor {
  validateItems([...items]);
  const group = savedRodGroup(items, groupKey);
  const groupItems = new Set(group.items);
  const rows: SavedRodGroupEditRow[] = items.flatMap((item, sourceIndex) =>
    !isEquipmentItem(item) && groupItems.has(item)
      ? [{ key: `saved-${sourceIndex}`, sourceIndex, item: Object.freeze({ ...item }) }] : []);
  const identity = rows[0].item;
  const savedLengths = new Set(rows.map(row => row.item.length));
  if (catalogRod?.id === identity.fishingRodId) {
    for (const length of availableLengths(catalogRod)) {
      if (savedLengths.has(length)) continue;
      const unitPrice = priceForLength(catalogRod, length, mode);
      const item: RodQuoteItem = { fishingRodId: identity.fishingRodId, fishingRodName: identity.fishingRodName,
        brandName: identity.brandName, length, quantity: 0, unitPrice, rate: .7,
        finalUnitPrice: adjustedUnitPrice(unitPrice, .7, mode) };
      // Validate the offered catalogue price without treating the initial zero as a selected row.
      validateItems([{ ...item, quantity: 1 }]);
      rows.push({ key: `new-${length}`, sourceIndex: null, item: Object.freeze(item) });
    }
  }
  rows.sort((a, b) => a.item.length - b.item.length || (a.sourceIndex ?? Infinity) - (b.sourceIndex ?? Infinity));
  return Object.freeze({ groupKey, mode, rows: Object.freeze(rows.map(row => Object.freeze(row))) });
}

/** Quantity edits retain a historical final price; a changed rate explicitly recalculates it. */
export function savedRodEditUnitPrice(row: SavedRodGroupEditRow, rate: number, mode: CalculationMode): number {
  return row.sourceIndex !== null && rate === row.item.rate
    ? row.item.finalUnitPrice : adjustedUnitPrice(row.item.unitPrice, rate, mode);
}

/** Replace only the selected group's rows, preserving every other saved snapshot and its order. */
export function applySavedRodGroupEditor(
  existing: readonly QuoteItem[], editor: SavedRodGroupEditor,
  changes: readonly SavedRodGroupChange[], mode: CalculationMode,
): QuoteItem[] {
  validateItems([...existing]);
  const group = savedRodGroup(existing, editor.groupKey);
  const groupItems = new Set(group.items);
  const currentIndices = existing.flatMap((item, index) => groupItems.has(item) ? [index] : []);
  const savedRows = editor.rows.filter(row => row.sourceIndex !== null);
  if (mode !== editor.mode || currentIndices.length !== savedRows.length ||
      savedRows.some(row => row.sourceIndex === null || !currentIndices.includes(row.sourceIndex) ||
        isEquipmentItem(existing[row.sourceIndex]) || savedRodSnapshot(existing[row.sourceIndex] as RodQuoteItem) !== savedRodSnapshot(row.item))) {
    throw new Error("낚시대 항목이 변경되었습니다. 입력창을 다시 열어주세요.");
  }
  const changesByKey = new Map(changes.map(change => [change.key, change]));
  if (changes.length !== editor.rows.length || changesByKey.size !== changes.length ||
      editor.rows.some(row => !changesByKey.has(row.key))) {
    throw new Error("칸수별 입력 내용을 다시 확인해주세요.");
  }
  const replacements = new Map<number, RodQuoteItem | null>();
  const additions: RodQuoteItem[] = [];
  let selected = false;
  for (const row of editor.rows) {
    const change = changesByKey.get(row.key)!;
    if (!Number.isSafeInteger(change.quantity) || change.quantity < 0) throw new Error("수량은 0 이상의 정수로 입력해주세요.");
    if (!Number.isFinite(change.rate) || change.rate < 0 || change.rate > 1) throw new Error("적용율은 0~100%로 입력해주세요.");
    const item = change.quantity > 0 ? { ...row.item, quantity: change.quantity, rate: change.rate,
      finalUnitPrice: savedRodEditUnitPrice(row, change.rate, mode) } : null;
    if (item) selected = true;
    if (row.sourceIndex !== null) replacements.set(row.sourceIndex, item);
    else if (item) additions.push(item);
  }
  if (!selected) throw new Error("수량을 한 대 이상 입력해주세요.");
  const lastIndex = Math.max(...currentIndices);
  const items: QuoteItem[] = [];
  existing.forEach((item, index) => {
    if (replacements.has(index)) {
      const replacement = replacements.get(index);
      if (replacement) items.push(replacement);
    } else items.push(cloneItem(item));
    if (index === lastIndex) items.push(...additions);
  });
  validateItems(items);
  return items;
}
