import { normalizeDate, validateQuote, type QuoteItem, type QuoteRecord } from "./domain";
import { cloneEquipmentItem } from "./equipment";

export type PurchaseStatus = "unconfirmed" | "in_progress" | "completed" | "partial" | "not_completed";

export interface PurchaseOutcome {
  status: PurchaseStatus;
  purchasedOn: string | null;
  actualAmount: number | null;
  reason: string;
  note: string;
  /** Complete quoted item snapshots, independent from later edits to the quote. */
  quotedItems: QuoteItem[];
  /** Purchased quantities correspond to quotedItems, including zero for unpurchased rows. */
  quantities: number[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PurchaseOutcomeInput {
  status: PurchaseStatus;
  purchasedOn: string | null;
  actualAmount: number | null;
  reason: string;
  note: string;
  quantities: number[];
  useCurrentQuoteItems?: boolean;
}

const labels: Record<PurchaseStatus, string> = {
  unconfirmed: "미확인", in_progress: "상담 중", completed: "매입 완료", partial: "일부 매입", not_completed: "미성사",
};
const isFinal = (status: PurchaseStatus) => status === "completed" || status === "partial";
const cloneItem = (item: QuoteItem): QuoteItem => item.kind === "equipment" ? cloneEquipmentItem(item) : { ...item };

export function purchaseStatusLabel(status: PurchaseStatus): string { return labels[status]; }

export function emptyPurchaseOutcome(status: PurchaseStatus = "unconfirmed"): PurchaseOutcome {
  return { status, purchasedOn: null, actualAmount: null, reason: "", note: "", quotedItems: [], quantities: [], updatedAt: null, updatedBy: null };
}

function validStatus(value: unknown): PurchaseStatus {
  if (typeof value !== "string" || !Object.hasOwn(labels, value)) throw new Error("매입 진행 상태를 확인해주세요.");
  return value as PurchaseStatus;
}

function limitedText(value: unknown, limit: number, label: string): string {
  if (typeof value !== "string" || value.trim().length > limit) throw new Error(`${label}은 ${limit.toLocaleString("ko-KR")}자 이내로 입력해주세요.`);
  return value.trim();
}

function purchaseDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith("0000-")) throw new Error("매입일을 입력해주세요.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("올바른 매입일을 입력해주세요.");
  return value;
}

function actualAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("실제 매입금액을 0원 이상으로 입력해주세요.");
  return value;
}

function validateSnapshots(items: QuoteItem[], quantities: unknown, status: PurchaseStatus): number[] {
  validateQuote({ title: "매입 결과", customerName: "", note: "", items });
  if (!Array.isArray(quantities) || quantities.length !== items.length || quantities.some((value, index) => !Number.isSafeInteger(value) || value < 0 || value > items[index].quantity)) {
    throw new Error("매입 수량은 각 견적 수량 이내의 정수로 입력해주세요.");
  }
  if (!quantities.some(value => value > 0)) throw new Error("매입한 품목의 수량을 한 개 이상 입력해주세요.");
  const allPurchased = quantities.every((value, index) => value === items[index].quantity);
  if (status === "completed" && !allPurchased) throw new Error("매입 완료는 모든 견적 수량을 선택해주세요. 일부만 매입했다면 ‘일부 매입’을 선택하세요.");
  if (status === "partial" && allPurchased) throw new Error("모든 수량을 매입했다면 ‘매입 완료’를 선택해주세요.");
  return [...quantities];
}

/** Missing legacy data stays unconfirmed without writing a migration to Firestore. */
export function normalizePurchaseOutcome(value: unknown): PurchaseOutcome {
  if (value === undefined || value === null) return emptyPurchaseOutcome();
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("매입 결과 형식을 확인해주세요.");
  const raw = value as Record<string, unknown>;
  const status = validStatus(raw.status);
  const note = limitedText(raw.note ?? "", 2000, "매입 메모");
  const reason = status === "not_completed" ? limitedText(raw.reason ?? "", 120, "미성사 사유") : "";
  const outcome = { ...emptyPurchaseOutcome(status), note, reason, updatedAt: normalizeDate(raw.updatedAt), updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : null };
  if (!isFinal(status)) return outcome;
  if (!Array.isArray(raw.quotedItems)) throw new Error("매입 당시 견적 항목을 확인해주세요.");
  const items = raw.quotedItems as QuoteItem[];
  const quantities = validateSnapshots(items, raw.quantities, status);
  return { ...outcome, purchasedOn: purchaseDate(raw.purchasedOn), actualAmount: actualAmount(raw.actualAmount), quotedItems: items.map(cloneItem), quantities };
}

export function purchaseOutcomeFor(record: Pick<QuoteRecord, "purchaseOutcome">): PurchaseOutcome {
  return normalizePurchaseOutcome(record.purchaseOutcome);
}

export function purchaseSourceItems(record: Pick<QuoteRecord, "items" | "purchaseOutcome">, useCurrentQuoteItems = false): QuoteItem[] {
  const previous = purchaseOutcomeFor(record);
  const items = !useCurrentQuoteItems && previous.quotedItems.length ? previous.quotedItems : record.items;
  return items.map(cloneItem);
}

/** Firestore map key order is not part of a saved item's identity or price snapshot. */
export function purchaseItemsMatch(left: readonly QuoteItem[], right: readonly QuoteItem[]): boolean {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object") {
      const fields = value as Record<string, unknown>;
      return Object.fromEntries(Object.keys(fields).sort().filter(key => fields[key] !== undefined).map(key => [key, canonical(fields[key])]));
    }
    return value;
  }
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

/** Build a separate acquisition snapshot; changing a catalogue or quote cannot reprice it. */
export function buildPurchaseOutcome(record: Pick<QuoteRecord, "mode" | "items" | "purchaseOutcome">, input: PurchaseOutcomeInput): PurchaseOutcome {
  if (record.mode !== "purchase") throw new Error("매입 결과는 매입 견적에서만 기록할 수 있습니다.");
  const status = validStatus(input.status);
  const note = limitedText(input.note, 2000, "매입 메모");
  const reason = status === "not_completed" ? limitedText(input.reason, 120, "미성사 사유") : "";
  if (input.useCurrentQuoteItems !== undefined && typeof input.useCurrentQuoteItems !== "boolean") throw new Error("매입 품목 기준을 확인해주세요.");
  if (!isFinal(status)) return { ...emptyPurchaseOutcome(status), note, reason };
  const items = purchaseSourceItems(record, input.useCurrentQuoteItems);
  return { ...emptyPurchaseOutcome(status), note, reason, purchasedOn: purchaseDate(input.purchasedOn), actualAmount: actualAmount(input.actualAmount), quotedItems: items, quantities: validateSnapshots(items, input.quantities, status) };
}

export function selectedPurchaseItems(outcome: PurchaseOutcome): QuoteItem[] {
  const value = normalizePurchaseOutcome(outcome);
  return value.quotedItems.flatMap((item, index) => value.quantities[index] > 0 ? [{ ...cloneItem(item), quantity: value.quantities[index] }] : []);
}
