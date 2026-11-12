import { isEquipmentItem, validateQuote, type QuoteItem, type RodQuoteItem } from "./domain";
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
