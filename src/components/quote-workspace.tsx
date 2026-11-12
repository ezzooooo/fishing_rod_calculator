"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ChevronRight, ClipboardCopy, Copy, FileText, History, ImageDown, Plus, Printer, RotateCcw, Search, ShoppingBag, Trash2, Pencil, X } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useQuoteDraft } from "@/lib/quote-draft-context";
import { adjustedUnitPrice, availableLengths, buildQuoteText, groupQuoteItems, isEquipmentItem, modeLabel, priceForLength, quoteItemName, quoteItemSpecification, quoteItemUnit, quoteItemsFromDraft, quoteQuantityLabel, quoteSummary, quoteTotals, removeDraftRod, upsertDraftRod, validateQuote, type CalculationMode, type EquipmentQuoteItem, type FishingRod, type QuoteDraft, type QuoteDraftRod, type QuoteItem, type QuoteRecord, type RodQuoteItem } from "@/lib/domain";
import { formatAppliedRate, formatDateKey, formatDateTime, formatLengthRange, formatMoney } from "@/lib/format";
import { brandKey, brandSearchText, resolveBrandId } from "@/lib/brands";
import type { Brand } from "@/lib/domain";
import { copyReceiptImage, createReceiptImage, downloadReceiptImage } from "@/lib/receipt-image";
import { QuoteConflictError } from "@/lib/repository";
import { purchaseOutcomeFor, purchaseStatusLabel } from "@/lib/purchase-outcome";
import { appendQuoteItems, applySavedRodGroupEditor, createSavedRodGroupEditor, savedRodEditUnitPrice, type SavedRodGroupEditor, type SavedRodGroupChange } from "@/lib/quote-editing";
import { PurchaseOutcomePanel, PurchaseStatusBadge } from "@/components/purchase-outcome";
import { Button, EmptyState, Field, Input, Modal, PageHeading, Textarea } from "@/components/ui";
import { EquipmentPicker } from "@/components/equipment-picker";
import styles from "./quote-workspace.module.css";

export { QuoteDraftProvider } from "@/lib/quote-draft-context";

const rateOptions = [.4, .45, .5, .55, .6, .65, .7, .75, .8, .85, .9, .95, 1];
const rateLabel = (rate: number | null) => rate === null ? "직접 입력" : `${Number((rate * 100).toFixed(4))}%`;
const rodLabel = (item: QuoteItem) => `${item.brandName ? `[${item.brandName}] ` : ""}${quoteItemName(item)}`;
const referenceMoney = (price: number | null) => price === null ? "—" : formatMoney(price);
const specificationLabel = (item: QuoteItem) => isEquipmentItem(item) ? item.specification : quoteItemSpecification(item);
const configurationLabel = (item: QuoteItem) => isEquipmentItem(item) ? item.components.map(component => `${component.groupName}: ${component.choiceName}${component.quantity === 1 ? "" : ` ×${component.quantity}`}`).join(" · ") : "";
function ItemConfiguration({ item }: { item: QuoteItem }) {
  if (!isEquipmentItem(item) || !item.components.length) return null;
  return <details className={styles.itemConfiguration}><summary>1{item.unit}당 구성 {item.components.length}종</summary><ul>{item.components.map((component, index) => <li key={`${component.groupId}-${component.choiceId}-${index}`}><span>{component.groupName} · {component.choiceName} ×{component.quantity}</span><span>{formatMoney(component.unitPrice * component.quantity)}</span></li>)}</ul></details>;
}
const titleForDraft = (draft: QuoteDraft) => {
  const title = draft.customerName.trim()
    ? `${draft.customerName.trim()} ${modeLabel(draft.mode)} 견적`
    : `${draft.rods[0]?.rod.name ?? draft.equipment[0]?.productName ?? "새"}${draft.rods.length + draft.equipment.length > 1 ? ` 외 ${draft.rods.length + draft.equipment.length - 1}종` : ""} ${modeLabel(draft.mode)} 견적`;
  return title.length > 120 ? `${title.slice(0, 119)}…` : title;
};

function ModeToggle({ mode, onChange }: { mode: CalculationMode; onChange: (mode: CalculationMode) => void }) {
  return <div className={styles.modeToggle} aria-label="견적 구분">{(["purchase", "sale"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} className={mode === value ? styles.modeSelected : ""} onClick={() => onChange(value)}>{mode === value && <Check size={15} />}{modeLabel(value)}</button>)}</div>;
}

export function QuoteBuilder() {
  const { brands, rods, catalogLoading, catalogError, retry } = useApp();
  const { draft, setDraft, clearDraft } = useQuoteDraft();
  const [picker, setPicker] = useState<{ group?: QuoteDraftRod } | null>(null);
  const [equipmentPicker, setEquipmentPicker] = useState<{ item?: EquipmentQuoteItem } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [removedRod, setRemovedRod] = useState<{ group: QuoteDraftRod; index: number } | null>(null);
  useEffect(() => {
    if (!removedRod) return;
    const timeout = setTimeout(() => setRemovedRod(null), 8000);
    return () => clearTimeout(timeout);
  }, [removedRod]);
  function resetDraft() { setRemovedRod(null); clearDraft(); }
  function removeRod(group: QuoteDraftRod) {
    const snapshot = upsertDraftRod({ ...draft, rods: [] }, group).rods[0];
    setRemovedRod({ group: snapshot, index: draft.rods.findIndex(value => value.rod.id === group.rod.id) });
    setDraft(current => removeDraftRod(current, group.rod.id));
  }
  function undoRemoveRod() {
    if (!removedRod) return;
    setDraft(current => {
      if (current.rods.some(group => group.rod.id === removedRod.group.rod.id)) return current;
      const restored = upsertDraftRod({ ...current, rods: [] }, removedRod.group).rods[0];
      const rods = [...current.rods];
      rods.splice(Math.max(0, Math.min(removedRod.index, rods.length)), 0, restored);
      return { ...current, rods };
    });
    setRemovedRod(null);
  }
  const items = useMemo(() => quoteItemsFromDraft(draft), [draft]);
  const totals = quoteTotals(items);
  const groupCount = groupQuoteItems(items).length;
  const record: QuoteRecord = { id: "draft", title: titleForDraft(draft), customerName: draft.customerName.trim(), note: draft.note.trim(), mode: draft.mode, items, createdBy: "", createdAt: new Date().toISOString(), updatedAt: null, revision: 0, totalQuantity: totals.totalQuantity, totalPrice: totals.totalPrice };
  const hasContent = !!(draft.rods.length || draft.equipment.length || draft.customerName.trim() || draft.note.trim());
  return <>
    <PageHeading title="새 견적 만들기" description="낚시대와 용품을 한 고객의 견적에 담고 한 번에 저장하세요." action={<div className={styles.actions}><Link className={styles.linkButton} href="/quotes"><History size={16} />견적 내역</Link><Button variant="secondary" onClick={() => hasContent ? setResetOpen(true) : resetDraft()}><RotateCcw size={16} />새로 작성</Button></div>} />
    <div className={styles.builderGrid}>
      <div className={styles.builderMain}>
        <section className={`${styles.card} ${styles.customerStrip}`} aria-labelledby="customer-heading">
          <h2 id="customer-heading" className={styles.srOnly}>고객 정보</h2>
          <Field label="고객명 (선택)"><Input value={draft.customerName} maxLength={120} placeholder="고객명이나 구분할 이름" onChange={event => setDraft(current => ({ ...current, customerName: event.target.value }))} /></Field>
          <Field label="견적 구분"><ModeToggle mode={draft.mode} onChange={mode => setDraft(current => ({ ...current, mode }))} /></Field>
          <Field label="메모 (선택)"><Textarea value={draft.note} maxLength={4000} rows={1} placeholder="상담 내용이나 방문 일정" onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} /></Field>
        </section>
        <section className={styles.basketSection} aria-labelledby="basket-heading">
          <div className={styles.sectionHeading}><h2 id="basket-heading">담은 품목</h2><span className={styles.count}>{groupCount}종</span><div className={`${styles.actions} ${styles.addButton}`}><Button variant="secondary" onClick={() => setEquipmentPicker({})}><Plus size={17} />용품 추가</Button><Button onClick={() => setPicker({})} disabled={catalogLoading || !rods.length}><Plus size={17} />낚시대 추가</Button></div></div>
          {removedRod && !draft.rods.some(group => group.rod.id === removedRod.group.rod.id) && <div className={styles.undoNotice} role="status"><span>{removedRod.group.rod.name}을 견적에서 뺐습니다.</span><Button variant="secondary" onClick={undoRemoveRod}><RotateCcw size={14} />되돌리기</Button><Button variant="ghost" aria-label="되돌리기 알림 닫기" onClick={() => setRemovedRod(null)}><X size={15} /></Button></div>}
          {catalogError && <div className={styles.error} role="alert"><span>가격표를 불러오지 못했습니다. 작성 중인 견적은 유지됩니다.</span><Button variant="secondary" onClick={retry}>가격표 다시 불러오기</Button></div>}
          {catalogLoading && !items.length ? <div className={styles.card}>가격표를 불러오는 중입니다…</div> : !items.length ? <div className={styles.card}><EmptyState title="아직 담은 품목이 없습니다" description="낚시대는 칸수별로, 텐트·좌대·받침틀은 구성품을 골라 담으세요." action={<div className={styles.actions}>{!!rods.length && <Button onClick={() => setPicker({})}><Plus size={16} />첫 낚시대 담기</Button>}<Button variant="secondary" onClick={() => setEquipmentPicker({})}>용품 직접 추가</Button></div>} /></div> : draft.rods.map(group => {
            const groupItems = quoteItemsFromDraft({ ...draft, rods: [group], equipment: [] }).filter((item): item is RodQuoteItem => !isEquipmentItem(item));
            const subtotal = quoteTotals(groupItems);
            return <article className={`${styles.card} ${styles.rodCard}`} key={group.rod.id} data-testid={`draft-rod-${group.rod.id}`}>
              <div className={styles.rodHeading}>
                <h3><span className={styles.brand}>{group.brandName || "브랜드 미지정"}</span>{group.rod.name}<span className={styles.groupQuantity}>{subtotal.totalQuantity}대</span></h3>
                <strong className={styles.groupSubtotal}>{formatMoney(subtotal.totalPrice)}</strong>
                <div className={styles.actions}><Button variant="ghost" aria-label={`${group.rod.name} 수정`} title="낚시대 수정" onClick={() => setPicker({ group })}><Pencil size={16} /></Button><Button variant="ghost" aria-label={`${group.rod.name} 빼기`} title="낚시대 빼기" onClick={() => removeRod(group)}><X size={17} /></Button></div>
              </div>
              <div className={styles.basketTableHead} aria-hidden="true"><div><span>칸수</span><span>수량</span></div><span>최종 단가</span><span>적용율</span><span>금액</span></div>
              <div className={styles.itemList}>{groupItems.map(item => <div className={styles.basketLine} key={item.length}>
                <div className={styles.basketIdentity}><strong>{item.length}칸</strong><span>{item.quantity}대</span></div>
                <span className={styles.basketUnit}><i>단가 </i>{formatMoney(item.finalUnitPrice)}</span>
                <span className={styles.basketRate}><i>적용율 </i>{rateLabel(item.rate)}</span>
                <strong className={styles.basketAmount}>{formatMoney(item.finalUnitPrice * item.quantity)}</strong>
              </div>)}</div>
            </article>;
          })}
          {draft.equipment.map(item => <article className={`${styles.card} ${styles.rodCard}`} key={item.id} data-testid={`draft-equipment-${item.id}`}>
            <div className={styles.rodHeading}><h3><span className={styles.brand}>{item.categoryName || "용품"}</span>{item.productName}<span className={styles.groupQuantity}>{item.quantity}{item.unit}</span></h3><strong className={styles.groupSubtotal}>{formatMoney(item.finalUnitPrice * item.quantity)}</strong><div className={styles.actions}><Button variant="ghost" aria-label={`${item.productName} 용품 수정`} onClick={() => setEquipmentPicker({ item })}><Pencil size={16}/></Button><Button variant="ghost" aria-label={`${item.productName} 용품 빼기`} onClick={() => setDraft(current => ({ ...current, equipment: current.equipment.filter(value => value.id !== item.id) }))}><X size={17}/></Button></div></div>
            <div className={styles.equipmentDraftLine}><div><strong>{item.specification || "기본 규격"} · {item.quantity}{item.unit}</strong><span>{item.brandName || "브랜드 미지정"}</span></div><span>기준 {referenceMoney(item.unitPrice)}</span><span>{item.pricingMode === "direct" ? "직접 입력" : rateLabel(item.rate)}</span><strong>단가 {formatMoney(item.finalUnitPrice)}</strong></div>
            {!!item.components.length && <div className={styles.equipmentDraftConfiguration}><ItemConfiguration item={item}/></div>}
          </article>)}
        </section>
      </div>
      <aside className={`${styles.card} ${styles.summary}`} aria-label="견적 합계">
        <h2>견적 합계</h2>
        <div className={styles.summaryMeta}><span className={styles.badge}>{modeLabel(draft.mode)} 견적</span><span>{groupCount}종 · {quoteQuantityLabel(items)}</span></div>
        <strong className={styles.grandTotal} data-testid="quote-total">{formatMoney(totals.totalPrice)}</strong>
        <div className={styles.summaryOriginal}><span>기준 합계</span><span>{referenceMoney(totals.totalOriginalPrice)}</span></div>
        <p className={styles.summaryHelp}>{totals.totalOriginalPrice === null ? "기준가가 없는 품목이 포함되어 기준 합계와 평균 적용율은 표시하지 않습니다." : items.length ? "담은 품목 전체가 한 건의 견적으로 저장됩니다." : "품목을 담으면 전체 금액을 확인할 수 있습니다."}</p>
        {!!items.length && <QuoteActions record={record} />}
      </aside>
    </div>
    <div className={styles.saveBar} data-testid="quote-save-bar"><div><span>{draft.customerName.trim() ? `${draft.customerName.trim()} · ` : ""}{groupCount}종 · {quoteQuantityLabel(items)}</span><strong>{formatMoney(totals.totalPrice)}</strong></div><Button onClick={() => setSaving(true)} disabled={!items.length}><FileText size={17} />견적 저장</Button></div>
    {picker && <RodPicker mode={draft.mode} rods={rods} brands={brands} groups={draft.rods} initial={picker.group} onClose={() => setPicker(null)} onApply={group => { setRemovedRod(current => current?.group.rod.id === group.rod.id ? null : current); setDraft(current => upsertDraftRod(picker.group && picker.group.rod.id !== group.rod.id ? removeDraftRod(current, picker.group.rod.id) : current, group)); setPicker(null); }} />}
    {saving && <SaveQuote record={record} onClose={() => setSaving(false)} onSaved={resetDraft} />}
    {equipmentPicker && <EquipmentPicker mode={draft.mode} initial={equipmentPicker.item} onClose={() => setEquipmentPicker(null)} onApply={item => { setDraft(current => ({ ...current, equipment: equipmentPicker.item ? current.equipment.map(value => value.id === equipmentPicker.item?.id ? item : value) : [...current.equipment, item] })); setEquipmentPicker(null); }} />}
    {resetOpen && <Modal title="새 견적을 작성할까요?" onClose={() => setResetOpen(false)} footer={<><Button variant="secondary" onClick={() => setResetOpen(false)}>계속 작성</Button><Button onClick={() => { resetDraft(); setResetOpen(false); }}>새로 작성</Button></>}><p>작성 중인 고객 정보와 담은 품목을 비웁니다.</p></Modal>}
  </>;
}

type RodQuantityRow = { key: string; length: number; label: string; quantity: string; rate: number; unitPrice: number; finalUnitPrice: number; detail?: string };
function RodQuantityFields({ name, description, rows, formId, selectionKey, onQuantity, onRate, onBulkRate }: { name: string; description: string; rows: RodQuantityRow[]; formId: string; selectionKey: string; onQuantity: (key: string, quantity: string) => void; onRate: (key: string, rate: number) => void; onBulkRate: (rate: number) => void }) {
  return <>
    <div className={styles.pickerHeading}><div><h3>{name}</h3><p>{description}</p></div><Field label="적용율 일괄"><select className="control" key={selectionKey} aria-label="적용율 일괄" defaultValue="" onChange={event => { const rate = Number(event.target.value); if (Number.isFinite(rate)) onBulkRate(rate); }}><option value="" disabled>일괄 선택</option>{rateOptions.map(rate => <option key={rate} value={rate}>{rateLabel(rate)}</option>)}</select></Field></div>
    <div className={styles.pickerRows}>{rows.map((row, index) => {
      const options = [...new Set([...rateOptions, row.rate])].sort((a, b) => a - b);
      return <div className={styles.pickerRow} key={row.key}>
        <div className={styles.pickerLength}><strong>{row.label}</strong><span>기준 {formatMoney(row.unitPrice)}</span>{row.detail && <span>{row.detail}</span>}</div>
        <Field label="수량"><Input aria-label={`${row.label} 수량`} data-testid={`quantity-${row.key}`} data-rod-quantity type="number" min={0} step={1} required value={row.quantity} onChange={event => onQuantity(row.key, event.target.value)} onKeyDown={event => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          const form = event.currentTarget.form;
          if (event.ctrlKey || event.metaKey) { form?.requestSubmit(); return; }
          const next = form?.querySelectorAll<HTMLInputElement>("[data-rod-quantity]")[index + 1];
          if (next) next.focus();
          else form?.ownerDocument.querySelector<HTMLButtonElement>(`button[form="${formId}"][type="submit"]`)?.focus();
        }} /></Field>
        <Field label="적용율"><select className="control" tabIndex={-1} aria-label={`${row.label} 적용율`} value={row.rate} onChange={event => onRate(row.key, Number(event.target.value))}>{options.map(rate => <option key={rate} value={rate}>{rateLabel(rate)}</option>)}</select></Field>
        <div className={styles.pickerSubtotal}><span>소계</span><strong>{formatMoney(row.finalUnitPrice * Math.max(0, Number(row.quantity) || 0))}</strong></div>
      </div>;
    })}</div>
  </>;
}

type RodLine = { quantity: string; discountRate: number; saleRate: number };
type RodPickerProps = { mode: CalculationMode; rods: FishingRod[]; brands: Brand[]; groups: QuoteDraftRod[]; initial?: QuoteDraftRod; appendToQuote?: boolean; onClose: () => void; onApply: (group: QuoteDraftRod) => void };
function RodPicker({ mode, rods, brands, groups, initial, appendToQuote = false, onClose, onApply }: RodPickerProps) {
  const existing = useMemo(() => new Map([...groups, ...(initial ? [initial] : [])].map(group => [group.rod.id, group])), [groups, initial]);
  const catalogue = useMemo(() => [...new Map([...rods, ...[...existing.values()].map(group => group.rod)].map(rod => [rod.id, rod])).values()].sort((a, b) => a.name.localeCompare(b.name, "ko")), [rods, existing]);
  const brandName = (rod: FishingRod) => existing.get(rod.id)?.brandName ?? brands.find(brand => brand.id === rod.brandId)?.name ?? "알 수 없음";
  const initialLines = (rod: FishingRod): Record<string, RodLine> => {
    const group = existing.get(rod.id);
    const lengths = [...new Set([...availableLengths(rod), ...(group?.calculations.map(item => item.length) ?? [])])].sort((a, b) => a - b);
    return Object.fromEntries(lengths.map(length => { const item = group?.calculations.find(value => value.length === length); return [length, { quantity: String(item?.quantity ?? 0), discountRate: item?.discountRate ?? .7, saleRate: item?.saleRate ?? .7 }]; }));
  };
  const [selectedId, setSelectedId] = useState(initial?.rod.id ?? "");
  const [lines, setLines] = useState<Record<string, RodLine>>(() => initial ? initialLines(initial.rod) : {});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const selected = catalogue.find(rod => rod.id === selectedId);
  const filtered = catalogue.filter(rod => {
    const brand = brands.find(value => value.id === resolveBrandId(brands, rod.brandId));
    return brandKey(`${brandName(rod)} ${rod.name} ${brand ? brandSearchText(brand) : ""}`).includes(brandKey(search.trim()));
  });
  const lengths = Object.keys(lines).map(Number).sort((a, b) => a - b);
  const selectedOptions = selected && !filtered.some(rod => rod.id === selectedId) ? [selected, ...filtered] : filtered;
  const totalQuantity = lengths.reduce((total, length) => total + Math.max(0, Number(lines[length].quantity) || 0), 0);
  const totalPrice = selected ? lengths.reduce((total, length) => total + adjustedUnitPrice(priceForLength(selected, length, mode), mode === "purchase" ? lines[length].discountRate : lines[length].saleRate, mode) * Math.max(0, Number(lines[length].quantity) || 0), 0) : 0;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (lengths.some(length => !Number.isSafeInteger(Number(lines[length].quantity)) || Number(lines[length].quantity) < 0)) { setError("수량은 0 이상의 정수로 입력해주세요."); return; }
    const calculations = lengths.filter(length => Number(lines[length].quantity) > 0).map(length => ({ fishingRodId: selected.id, length, quantity: Number(lines[length].quantity), discountRate: lines[length].discountRate, saleRate: lines[length].saleRate }));
    if (!calculations.length) { setError("수량을 한 대 이상 입력해주세요."); return; }
    try { onApply({ rod: selected, brandName: brandName(selected), calculations }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "낚시대를 견적에 담지 못했습니다. 입력 내용을 확인해주세요."); }
  }
  return <Modal wide title={initial ? "담은 낚시대 수정" : "낚시대 담기"} closeOnBackdrop={false} onClose={onClose} footer={<div className={styles.pickerFooter}><div><span>총 {totalQuantity}대</span><strong>{formatMoney(totalPrice)}</strong></div><Button form="rod-picker" type="submit" disabled={!selected}>{existing.has(selectedId) ? <Check size={17} /> : <Plus size={17} />}{existing.has(selectedId) ? "변경 반영" : "견적에 담기"}</Button></div>}>
    <form id="rod-picker" className={styles.pickerForm} onSubmit={submit}>
      <p className={styles.intro}>{modeLabel(mode)} 견적에 담을 낚시대와 칸수별 수량을 선택하세요.<span className={styles.keyboardHint}>Tab / Enter 다음 수량 · Shift+Tab 이전 수량 · ⌘/Ctrl+Enter 담기</span></p>
      <div className={styles.pickerSelectors}>
      <Field label="낚시대 검색"><div className={styles.searchInput}><Search size={17} /><Input placeholder="낚시대명 또는 브랜드명으로 검색" value={search} onChange={event => setSearch(event.target.value)} /></div></Field>
      <Field label="낚시대 선택"><select className="control" aria-label="낚시대 선택" value={selectedId} onChange={event => { const rod = catalogue.find(item => item.id === event.target.value); setSelectedId(rod?.id ?? ""); setLines(rod ? initialLines(rod) : {}); setError(""); }}><option value="">낚시대를 선택해주세요</option>{selectedOptions.map(rod => <option value={rod.id} key={rod.id}>[{brandName(rod)}] {rod.name}</option>)}</select></Field>
      </div>
      {!filtered.length && <p className={styles.muted}>검색 결과가 없습니다. 다른 이름으로 검색해주세요.</p>}
      {selected ? <RodQuantityFields
        name={selected.name}
        description={appendToQuote ? "입력한 수량을 기존 견적에 추가합니다. 기존 항목의 가격은 유지됩니다." : existing.has(selectedId) ? "이미 담은 낚시대입니다. 변경 반영을 누르면 기존 수량을 바꿉니다." : "종류를 바꿔도 다른 낚시대의 수량은 복사되지 않습니다."}
        formId="rod-picker" selectionKey={selectedId}
        rows={lengths.map(length => { const line = lines[length]; const rate = mode === "purchase" ? line.discountRate : line.saleRate; const unitPrice = priceForLength(selected, length, mode); return { key: String(length), length, label: `${length}칸`, quantity: line.quantity, rate, unitPrice, finalUnitPrice: adjustedUnitPrice(unitPrice, rate, mode) }; })}
        onQuantity={(key, quantity) => { setLines(current => ({ ...current, [key]: { ...current[key], quantity } })); setError(""); }}
        onRate={(key, rate) => setLines(current => ({ ...current, [key]: { ...current[key], [mode === "purchase" ? "discountRate" : "saleRate"]: rate } }))}
        onBulkRate={rate => setLines(current => Object.fromEntries(Object.entries(current).map(([key, line]) => [key, { ...line, [mode === "purchase" ? "discountRate" : "saleRate"]: rate }])))}
      /> : <div className={styles.pickerEmpty}><ShoppingBag size={34} /><p>낚시대를 선택하면 칸수별 수량을 입력할 수 있습니다.</p></div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </form>
  </Modal>;
}

function SavedRodGroupPicker({ editor, onClose, onApply }: { editor: SavedRodGroupEditor; onClose: () => void; onApply: (changes: SavedRodGroupChange[]) => void }) {
  const [changes, setChanges] = useState(() => Object.fromEntries(editor.rows.map(row => [row.key, { quantity: String(row.item.quantity), rate: row.item.rate }])));
  const [error, setError] = useState("");
  const first = editor.rows.find(row => row.sourceIndex !== null)!.item;
  const counts = new Map<number, number>();
  const occurrences = new Map<number, number>();
  editor.rows.forEach(row => counts.set(row.item.length, (counts.get(row.item.length) ?? 0) + 1));
  const rows: RodQuantityRow[] = editor.rows.map(row => {
    const line = changes[row.key];
    const occurrence = (occurrences.get(row.item.length) ?? 0) + 1;
    occurrences.set(row.item.length, occurrence);
    const duplicate = counts.get(row.item.length)! > 1;
    return { key: row.key, length: row.item.length, label: `${row.item.length}칸${duplicate ? ` 항목 ${occurrence}` : ""}`, quantity: line.quantity, rate: line.rate, unitPrice: row.item.unitPrice, finalUnitPrice: savedRodEditUnitPrice(row, line.rate, editor.mode), detail: row.sourceIndex === null ? "추가 가능 칸수" : duplicate ? `기존 ${rateLabel(row.item.rate)} · 단가 ${formatMoney(row.item.finalUnitPrice)}` : undefined };
  });
  const totalQuantity = rows.reduce((total, row) => total + Math.max(0, Number(row.quantity) || 0), 0);
  const totalPrice = rows.reduce((total, row) => total + row.finalUnitPrice * Math.max(0, Number(row.quantity) || 0), 0);
  function submit(event: FormEvent) {
    event.preventDefault();
    try { onApply(rows.map(row => ({ key: row.key, quantity: Number(row.quantity), rate: row.rate }))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "낚시대 수량과 적용율을 확인해주세요."); }
  }
  return <Modal wide title="담은 낚시대 수정" closeOnBackdrop={false} onClose={onClose} footer={<div className={styles.pickerFooter}><div><span>총 {totalQuantity}대</span><strong>{formatMoney(totalPrice)}</strong></div><Button type="submit" form="saved-rod-picker"><Check size={17}/>변경 반영</Button></div>}>
    <form id="saved-rod-picker" className={styles.pickerForm} onSubmit={submit}>
      <p className={styles.intro}>{first.brandName ? `[${first.brandName}] ` : ""}{first.fishingRodName}의 칸수별 수량과 적용율을 수정하세요.<span className={styles.keyboardHint}>Tab / Enter 다음 수량 · Shift+Tab 이전 수량 · ⌘/Ctrl+Enter 변경 반영</span></p>
      <RodQuantityFields name={first.fishingRodName} description="수량 0은 해당 항목을 뺍니다. 기존 칸수는 저장된 기준 단가를, 추가 칸수는 현재 가격표를 사용합니다." rows={rows} formId="saved-rod-picker" selectionKey={editor.groupKey}
        onQuantity={(key, quantity) => { setChanges(current => ({ ...current, [key]: { ...current[key], quantity } })); setError(""); }}
        onRate={(key, rate) => { setChanges(current => ({ ...current, [key]: { ...current[key], rate } })); setError(""); }}
        onBulkRate={rate => { setChanges(current => Object.fromEntries(Object.entries(current).map(([key, line]) => [key, { ...line, rate }]))); setError(""); }}/>
      {error && <div className={styles.error} role="alert">{error}</div>}
    </form>
  </Modal>;
}

function SaveQuote({ record, onClose, onSaved }: { record: QuoteRecord; onClose: () => void; onSaved: () => void }) {
  const { repository, notify } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState(record.title);
  const [note, setNote] = useState(record.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !repository) return;
    try { validateQuote({ ...record, title, note }); } catch (failure) { setError(failure instanceof Error ? failure.message : "견적 정보를 확인해주세요."); return; }
    setBusy(true); setError("");
    try {
      const id = await repository.createQuote({ title: title.trim(), note: note.trim(), customerName: record.customerName, mode: record.mode, items: record.items });
      onSaved(); onClose(); notify("견적을 저장했습니다.", "success"); router.push(`/quotes/detail?id=${encodeURIComponent(id)}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "견적을 저장하지 못했습니다. 다시 시도해주세요."); setBusy(false); }
  }
  const rodCount = groupQuoteItems(record.items).length;
  return <Modal title="견적 저장" onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button type="submit" form="save-quote" disabled={busy}>{busy ? "저장 중…" : "저장"}</Button></>}>
    <form id="save-quote" onSubmit={save}><div className={styles.saveOverview}><span>{modeLabel(record.mode)} · {rodCount}종 · {quoteQuantityLabel(record.items)}</span><strong>{formatMoney(record.totalPrice)}</strong>{record.customerName && <p>고객 {record.customerName}</p>}</div><p className={styles.intro}>낚시대와 용품의 선택 구성·가격을 한 건의 견적으로 기록합니다.</p><Field label="견적 제목"><Input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required /></Field><Field label="메모 (선택)"><Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={4000} rows={3} /></Field>{error && <div className={styles.error} role="alert">{error}</div>}</form>
  </Modal>;
}

function QuoteActions({ record }: { record: QuoteRecord }) {
  const { notify } = useApp();
  const [preview, setPreview] = useState(false);
  const [imageBusy, setImageBusy] = useState<"save" | "copy" | null>(null);
  const [receiptImage, setReceiptImage] = useState<Blob | null>(null);
  const [imagePreparing, setImagePreparing] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!preview || !receiptRef.current) return;
    let active = true;
    setReceiptImage(null); setImagePreparing(true); setImageError(""); setImageMessage("");
    void createReceiptImage(receiptRef.current).then(image => {
      if (active) setReceiptImage(image);
    }).catch(failure => {
      if (active) setImageError(failure instanceof Error ? failure.message : "이미지를 만들지 못했습니다. 다시 시도해주세요.");
    }).finally(() => { if (active) setImagePreparing(false); });
    return () => { active = false; };
  }, [preview, record, imageAttempt]);
  async function copy() {
    try { await navigator.clipboard.writeText(buildQuoteText(record)); notify("전체 견적을 복사했습니다.", "success"); } catch { notify("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해주세요.", "error"); }
  }
  async function exportImage(action: "save" | "copy") {
    if (!receiptImage || imageBusy) return;
    setImageBusy(action); setImageMessage(""); setImageError("");
    try {
      if (action === "copy") {
        await copyReceiptImage(receiptImage);
        setImageMessage("견적서 이미지를 복사했습니다. 원하는 곳에 붙여넣으세요.");
      } else {
        const title = record.title.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "견적서";
        downloadReceiptImage(receiptImage, `${title}-${formatDateKey()}.png`);
        setImageMessage("견적서 전체를 PNG 이미지 한 장으로 저장했습니다.");
      }
    } catch (failure) {
      setImageError(failure instanceof Error ? failure.message : "이미지를 만들지 못했습니다. 다시 시도해주세요.");
    } finally { setImageBusy(null); }
  }
  async function print() {
    if (!receiptRef.current) return;
    const previewWindow = window.open("", "_blank", "width=1000,height=800");
    if (!previewWindow) { notify("인쇄 창을 열 수 없습니다. 팝업 차단 설정을 확인해주세요.", "error"); return; }
    previewWindow.opener = null;
    const printDocument = previewWindow.document;
    printDocument.documentElement.lang = "ko";
    printDocument.title = record.title;
    // Print the same receipt shown in the preview, with the same loaded styles.
    const stylesReady = [...document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style')].map(source => {
      if (source instanceof HTMLStyleElement) { printDocument.head.append(source.cloneNode(true)); return Promise.resolve(); }
      const link = printDocument.createElement("link");
      link.rel = "stylesheet"; link.href = source.href;
      return new Promise<void>((resolve, reject) => {
        link.onload = () => resolve(); link.onerror = () => reject(new Error("인쇄 스타일을 불러오지 못했습니다."));
        printDocument.head.append(link);
      });
    });
    const printStyle = printDocument.createElement("style");
    printStyle.textContent = "@page{size:A4;margin:15mm}html,body{background:#fff!important}body{padding:24px;margin:0}@media print{body{padding:0}}";
    printDocument.head.append(printStyle);
    printDocument.body.append(receiptRef.current.cloneNode(true));
    try {
      await Promise.all(stylesReady);
      await printDocument.fonts.ready;
      if (!previewWindow.closed) { previewWindow.focus(); previewWindow.print(); }
    } catch {
      previewWindow.close();
      notify("인쇄 화면을 준비하지 못했습니다. 다시 시도해주세요.", "error");
    }
  }
  return <><div className={styles.outputActions}><Button variant="secondary" onClick={() => { setReceiptImage(null); setImageMessage(""); setImageError(""); setPreview(true); }}><FileText size={16} />견적서 미리보기</Button><Button variant="ghost" onClick={copy}><ClipboardCopy size={16} />견적 복사</Button></div>{preview && <Modal wide title="견적서 미리보기" onClose={imageBusy ? undefined : () => setPreview(false)} footer={<><Button variant="ghost" disabled={!!imageBusy} onClick={() => setPreview(false)}>닫기</Button><Button variant="secondary" disabled={!!imageBusy || imagePreparing || !receiptImage} aria-busy={imageBusy === "save"} onClick={() => void exportImage("save")}><ImageDown size={16} />이미지 저장</Button><Button variant="secondary" disabled={!!imageBusy || imagePreparing || !receiptImage} aria-busy={imageBusy === "copy"} onClick={() => void exportImage("copy")}><Copy size={16} />{imageBusy === "copy" ? "이미지 복사 중…" : "이미지 복사"}</Button><Button disabled={!!imageBusy} onClick={print}><Printer size={16} />인쇄 / PDF 저장</Button></>}>
    {(imageMessage || imagePreparing) && <p className={styles.receiptImageStatus} role="status">{imagePreparing ? "견적서 전체 이미지를 준비하고 있습니다…" : imageMessage}</p>}{imageError && <div className={styles.error} role="alert"><span>{imageError}</span><Button variant="secondary" onClick={() => setImageAttempt(value => value + 1)}>이미지 다시 준비</Button></div>}
    <div ref={receiptRef}><Receipt record={record} /></div>
  </Modal>}</>;
}

function PriceSummary({ summary, mode, total = false, receipt = false, lengthRange, rangeCaption = "칸수 범위", quantityText, quantityCaption = "총 대수" }: { summary: ReturnType<typeof quoteSummary>; mode: CalculationMode; total?: boolean; receipt?: boolean; lengthRange?: string; rangeCaption?: string; quantityText?: string; quantityCaption?: string }) {
  return <dl className={`${styles.priceSummary} ${total ? styles.priceSummaryTotal : ""} ${receipt ? styles.receiptSummary : ""} ${receipt && !lengthRange ? styles.receiptOverallSummary : ""}`}>
    {lengthRange && <div><dt>{rangeCaption}</dt><dd>{lengthRange}</dd></div>}
    {receipt && <div><dt>{quantityCaption}</dt><dd>{quantityText ?? `${summary.totalQuantity}대`}</dd></div>}
    <div><dt>총 가격</dt><dd>{referenceMoney(summary.totalOriginalPrice)}</dd></div>
    <div><dt>평균 적용율</dt><dd>{formatAppliedRate(summary.appliedRate)}</dd></div>
    <div><dt>{receipt ? "총 " : ""}{modeLabel(mode)}가격</dt><dd>{formatMoney(summary.totalPrice)}</dd></div>
  </dl>;
}

function Receipt({ record }: { record: QuoteRecord }) {
  const groups = groupQuoteItems(record.items);
  const summary = quoteSummary(record.items);
  return <section className={styles.receipt} aria-label="견적서">
    <div className={styles.receiptBrand}><Image src="/songsan-logo.png" alt="송산 로고" width={32} height={32}/><span>송산중고낚시</span></div>
    <h2>{record.title}</h2>
    <div className={styles.receiptMeta}><span>{modeLabel(record.mode)} 견적{record.customerName ? ` · 고객 ${record.customerName}` : ""}</span><span>{formatDateTime(record.createdAt)}</span></div>
    <div className={styles.receiptGroups}>{groups.map(group => {
      const equipment = isEquipmentItem(group.items[0]);
      const specifications = [...new Set(group.items.map(specificationLabel).filter(Boolean))].join(" / ");
      const range = equipment ? specifications || "기본 규격" : formatLengthRange(group.items.filter((item): item is RodQuoteItem => !isEquipmentItem(item)).map(item => item.length));
      return <section className={styles.receiptGroup} key={group.key} aria-label={`${rodLabel(group.items[0])} 견적`}>
        <div className={styles.receiptGroupHeading}><h3>{rodLabel(group.items[0])}</h3>{equipment && <span>{(group.items[0] as EquipmentQuoteItem).categoryName}</span>}</div>
        <div className={styles.receiptTable}><table><thead><tr><th scope="col">{equipment ? "규격 / 구성" : "칸수"}</th><th scope="col">수량</th><th scope="col">기준 단가</th><th scope="col">적용율</th><th scope="col">{modeLabel(record.mode)} 단가</th><th scope="col">{modeLabel(record.mode)}금액</th></tr></thead><tbody>{group.items.map((item, index) => <tr key={index}><th scope="row">{specificationLabel(item) || "기본 규격"}{isEquipmentItem(item) && !!item.components.length && <small className={styles.receiptComponents}>1{item.unit}당 구성 · {configurationLabel(item)}</small>}</th><td>{item.quantity}{quoteItemUnit(item)}</td><td>{referenceMoney(item.unitPrice)}</td><td>{rateLabel(item.rate)}</td><td>{formatMoney(item.finalUnitPrice)}</td><td>{formatMoney(item.finalUnitPrice * item.quantity)}</td></tr>)}</tbody></table></div>
        <PriceSummary summary={group} mode={record.mode} receipt lengthRange={range} rangeCaption={equipment ? "규격" : "칸수 범위"} quantityText={quoteQuantityLabel(group.items)} quantityCaption={equipment ? "총 수량" : "총 대수"}/>
      </section>;
    })}</div>
    <section className={styles.receiptGrandTotal} aria-label="전체 합계"><div className={styles.receiptGroupHeading}><h3>전체 합계</h3></div><PriceSummary summary={summary} mode={record.mode} total receipt quantityText={quoteQuantityLabel(record.items)} quantityCaption={record.items.some(isEquipmentItem) ? "총 수량" : "총 대수"}/></section>
    <p className={styles.receiptHelp}>{summary.totalOriginalPrice === null ? "기준가가 없는 품목이 포함되어 전체 기준 총액과 평균 적용율은 —로 표시합니다. 최종 견적금액에는 모든 품목이 포함됩니다." : `총 가격은 비율 적용 전 기준 합계입니다. 평균 적용율은 ${modeLabel(record.mode)}가격 ÷ 총 가격 × 100이며, 저장된 최종 단가를 기준으로 계산합니다.`}</p>
    {record.note && <div className={styles.receiptNote}><h3>메모</h3><p>{record.note}</p></div>}
  </section>;
}

function HistoryAmounts({ record }: { record: QuoteRecord }) {
  const outcome = record.mode === "purchase" ? purchaseOutcomeFor(record) : null;
  const actualAmount = outcome && (outcome.status === "completed" || outcome.status === "partial") ? outcome.actualAmount : null;
  return <div className={styles.historyAmounts}>
    <div className={styles.historyMoney} data-label="견적금액"><strong data-testid="history-quoted-amount">{formatMoney(record.totalPrice)}</strong></div>
    <div className={`${styles.historyMoney} ${styles.historyActualAmount}`} data-label="최종 매입금액"><strong data-testid="history-actual-amount">{actualAmount === null ? "—" : formatMoney(actualAmount)}</strong></div>
  </div>;
}

export function QuoteHistory() {
  const { repository, status, brands } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ records: QuoteRecord[]; ready: boolean; error: string }>({ records: [], ready: false, error: "" });
  useEffect(() => { if (!repository || status !== "authorized") return; return repository.watchQuotes(records => setState({ records, ready: true, error: "" }), error => setState({ records: [], ready: true, error: error.message })); }, [repository, status, attempt]);
  const records = [...state.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const query = brandKey(search.trim());
  const filtered = records.filter(record => {
    const outcome = record.mode === "purchase" ? purchaseOutcomeFor(record) : null;
    if (statusFilter !== "all" && outcome?.status !== statusFilter) return false;
    return brandKey([record.title, record.customerName, record.note, modeLabel(record.mode), ...(outcome ? [purchaseStatusLabel(outcome.status), outcome.reason, outcome.note] : []), ...record.items.flatMap(item => {
      const brand = brands.find(value => [value.name, ...(value.aliases ?? [])].some(name => brandKey(name) === brandKey(item.brandName)));
      return [quoteItemName(item), item.brandName, brand ? brandSearchText(brand) : "", specificationLabel(item), configurationLabel(item), isEquipmentItem(item) ? item.categoryName : "낚시대"];
    })].join(" ")).includes(query);
  });
  return <><PageHeading title="견적 내역" description="견적과 실제 매입 결과를 함께 확인하고, 진행 상태별로 찾아보세요." action={<Link className={styles.primaryLink} href="/"><Plus size={17} />새 견적 만들기</Link>} /><div className={`${styles.card} ${styles.historySearchCard}`}><div className={styles.historyFilters}><div className={styles.historySearch}><Search size={19} /><Input aria-label="견적 검색" placeholder="고객명, 제품명, 구성품 또는 브랜드명 검색" value={search} onChange={event => setSearch(event.target.value)} /></div><select className="control" aria-label="매입 상태 필터" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">매입 상태 전체</option>{(["unconfirmed", "in_progress", "completed", "partial", "not_completed"] as const).map(value => <option key={value} value={value}>{purchaseStatusLabel(value)}</option>)}</select></div></div>{!state.ready ? <div className={styles.loading}>견적 내역을 불러오는 중입니다…</div> : state.error ? <div className={styles.card}><EmptyState title="견적 내역을 불러오지 못했습니다" description={state.error} action={<Button variant="secondary" onClick={() => { setState({ records: [], ready: false, error: "" }); setAttempt(value => value + 1); }}>다시 시도</Button>} /></div> : !records.length ? <div className={styles.card}><EmptyState title="저장된 견적이 없습니다" description="새 견적 만들기에서 낚시대와 용품을 담은 뒤 저장해주세요." action={<Link className={styles.primaryLink} href="/">새 견적 만들기</Link>} /></div> : !filtered.length ? <div className={styles.card}><EmptyState title="검색 결과가 없습니다" description="검색어나 매입 상태 필터를 바꿔보세요." /></div> : <><div className={styles.historyCount}>총 {filtered.length}건 · 최근 기록순</div><div className={styles.historyTable}>
      <div className={styles.historyTableHead} aria-hidden="true"><span>매입 상태</span><span>견적 / 고객</span><span className={styles.historyRodsColumn}>품목</span><span>수량</span><span className={styles.historyMoneyHeading}>견적금액</span><span className={styles.historyMoneyHeading}>최종 매입금액</span><span>기록 시간</span><span /></div>
      {filtered.map(record => <Link key={record.id} href={`/quotes/detail?id=${encodeURIComponent(record.id)}`} className={styles.historyRow}>
        <div className={styles.historyStatus}>{record.mode === "purchase" ? <PurchaseStatusBadge record={record}/> : <span className={`${styles.badge} ${styles.saleBadge}`}>판매</span>}</div>
        <div className={styles.historyIdentity}><h2 title={record.title}>{record.title}</h2><p title={record.customerName}>{record.customerName ? `고객 ${record.customerName}` : "고객명 미입력"}</p></div>
        <p className={styles.historyRodsColumn} title={[...new Set(record.items.map(rodLabel))].join(", ")}>{[...new Set(record.items.map(rodLabel))].join(", ")}</p>
        <span className={styles.historyQuantity}>{groupQuoteItems(record.items).length}종 · {quoteQuantityLabel(record.items)}</span>
        <HistoryAmounts record={record}/>
        <div className={styles.historyDates}><span>{formatDateTime(record.createdAt)}</span>{record.updatedAt && <span>수정 {formatDateTime(record.updatedAt)}</span>}</div>
        <ChevronRight className={styles.historyChevron} size={16} />
      </Link>)}
    </div></>}</>;

}

export function QuoteDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <QuoteDetailContent key={id} id={id} />;
}

function QuoteDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { repository, status, notify, rods, brands, catalogLoading, catalogError, retry } = useApp();
  const [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState<{ id: string; record: QuoteRecord | null; error: string }>({ id: "", record: null, error: "" });
  const [editing, setEditing] = useState<QuoteRecord | null>(null);
  const [base, setBase] = useState<QuoteRecord | null>(null);
  const [rodPickerOpen, setRodPickerOpen] = useState(false);
  const [rodGroupEditor, setRodGroupEditor] = useState<SavedRodGroupEditor | null>(null);
  const [itemEditor, setItemEditor] = useState<{ index: number; item?: RodQuoteItem } | null>(null);
  const [equipmentEditor, setEquipmentEditor] = useState<{ index: number; item?: EquipmentQuoteItem } | null>(null);
  const [discard, setDiscard] = useState<"cancel" | "leave" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = editing !== null && JSON.stringify(editing) !== JSON.stringify(base);
  useEffect(() => { if (!id || !repository || status !== "authorized") return; return repository.watchQuote(id, record => setRemote({ id, record, error: "" }), failure => setRemote({ id, record: null, error: failure.message })); }, [id, repository, status, attempt]);
  useEffect(() => {
    if (!changed) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const confirmLink = (event: MouseEvent) => { const link = event.target instanceof Element ? event.target.closest("a[href]") : null; if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; const href = link.getAttribute("href"); if (!href || href.startsWith("#") || href === window.location.pathname + window.location.search) return; if (!window.confirm("저장하지 않은 변경사항을 버리고 이동할까요?")) { event.preventDefault(); event.stopPropagation(); } };
    const currentUrl = window.location.href;
    const currentHistoryState = window.history.state;
    const confirmBack = (event: PopStateEvent) => {
      if (window.confirm("저장하지 않은 변경사항을 버리고 이동할까요?")) return;
      event.stopImmediatePropagation();
      window.history.pushState(currentHistoryState, "", currentUrl);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", confirmBack, true);
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", confirmBack, true);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [changed]);
  function leave() { if (changed) setDiscard("leave"); else router.push("/quotes"); }
  function cancel() { if (changed) setDiscard("cancel"); else { setEditing(null); setBase(null); setError(""); } }
  function addRod(group: QuoteDraftRod) {
    if (!editing) return;
    const additions = quoteItemsFromDraft({ mode: editing.mode, customerName: editing.customerName, note: editing.note, rods: [group], equipment: [] });
    const items = appendQuoteItems(editing.items, additions);
    setEditing(current => current && ({ ...current, items }));
    setRodPickerOpen(false);
    setError("");
  }
  function editRodGroup(groupKey: string, rodId: string) {
    if (!editing) return;
    try { setRodGroupEditor(createSavedRodGroupEditor(editing.items, groupKey, editing.mode, rods.find(rod => rod.id === rodId))); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "낚시대 항목을 불러오지 못했습니다."); }
  }
  async function save() {
    if (!editing || !repository || busy) return;
    const totals = quoteTotals(editing.items);
    const updated = { ...editing, ...totals };
    try { validateQuote(updated); } catch (failure) { setError(failure instanceof Error ? failure.message : "견적 정보를 확인해주세요."); return; }
    setBusy(true); setError("");
    try { await repository.updateQuote(updated); setEditing(null); setBase(null); notify("견적이 수정되었습니다.", "success"); } catch (failure) { setError(failure instanceof QuoteConflictError ? "다른 직원이 이 견적을 수정했습니다. 수정을 취소하고 최신 내역을 확인해주세요." : failure instanceof Error ? failure.message : "저장하지 못했습니다. 다시 시도해주세요."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!repository || busy) return;
    setBusy(true); setError("");
    try { await repository.deleteQuote(id); notify("견적을 삭제했습니다.", "success"); router.push("/quotes"); } catch (failure) { setError(failure instanceof Error ? failure.message : "삭제하지 못했습니다."); setDeleteOpen(false); } finally { setBusy(false); }
  }
  const record = editing ?? remote.record;
  if (!id) return <><PageHeading title="견적 상세" /><div className={styles.card}><EmptyState title="견적 주소를 확인해주세요" action={<Link className={styles.linkButton} href="/quotes">견적 내역으로</Link>} /></div></>;
  if (!editing && remote.id !== id) return <div className={styles.loading}>견적을 불러오는 중입니다…</div>;
  if (!editing && remote.error) return <div className={styles.card}><EmptyState title="견적을 불러오지 못했습니다" description={remote.error} action={<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>다시 시도</Button>} /></div>;
  if (!record) return <div className={styles.card}><EmptyState title="견적을 찾을 수 없습니다" description="삭제된 견적이거나 잘못된 주소입니다." action={<Link className={styles.linkButton} href="/quotes">견적 내역으로</Link>} /></div>;
  const totals = quoteSummary(record.items);
  const groups = groupQuoteItems(record.items);
  const displayRecord = { ...record, ...totals };
  return <>
    <div className={styles.detailBack}><button type="button" onClick={leave} disabled={busy}><ArrowLeft size={16} />견적 내역</button></div>
    <PageHeading title={editing ? "견적 수정" : "견적 상세"} description={`최초 기록 ${formatDateTime(record.createdAt)}${record.updatedAt ? ` · 최종 수정 ${formatDateTime(record.updatedAt)}` : ""}`} action={editing ? <Button variant="secondary" disabled={busy} onClick={cancel}>수정 취소</Button> : <div className={styles.actions}><Button variant="secondary" onClick={() => { setEditing(record); setBase(record); setError(""); }}><Pencil size={16} />견적 수정</Button><Button variant="ghost" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />삭제</Button></div>} />
    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.detailGrid}>
      <div className={styles.builderMain}>
        <section className={styles.card}>
          {editing ? <><Field label="견적 제목"><Input value={record.title} maxLength={120} required onChange={event => setEditing(current => current && ({ ...current, title: event.target.value }))} /></Field><div className={styles.customerGrid}><Field label="고객명 (선택)"><Input value={record.customerName} maxLength={120} onChange={event => setEditing(current => current && ({ ...current, customerName: event.target.value }))} /></Field><Field label="견적 구분"><select className="control" value={record.mode} onChange={event => { const mode = event.target.value as CalculationMode; setEditing(current => current && ({ ...current, mode, items: current.items.map(item => isEquipmentItem(item) ? item : ({ ...item, finalUnitPrice: adjustedUnitPrice(item.unitPrice, item.rate, mode) })) })); }}><option value="purchase">매입</option><option value="sale">판매</option></select></Field></div><p className={styles.help}>낚시대는 저장된 기준 단가와 적용율로 다시 계산하며, 용품은 입력한 견적금액을 유지합니다.</p></> : <><span className={styles.badge}>{modeLabel(record.mode)} 견적</span><h2 className={styles.detailTitle}>{record.title}</h2>{record.customerName && <p className={styles.customerName}>고객 {record.customerName}</p>}</>}
        </section>
        <PurchaseOutcomePanel record={record} disabled={!!editing || busy}/>
        <section className={styles.detailItemsSection}>
          <div className={styles.sectionHeading}><h2>견적 항목</h2><span className={styles.count}>{groups.length}종 · {record.items.length}개 항목</span>{editing && <div className={`${styles.actions} ${styles.addButton}`}><Button variant="secondary" onClick={() => setRodPickerOpen(true)} disabled={busy || catalogLoading || !rods.length || record.items.length >= 500}><Plus size={16} />낚시대 추가</Button><Button variant="secondary" onClick={() => setEquipmentEditor({ index: -1 })} disabled={busy || record.items.length >= 500}><Plus size={16} />용품 추가</Button><Button variant="ghost" onClick={() => setItemEditor({ index: -1 })} disabled={busy || record.items.length >= 500}>낚시대 직접 입력</Button></div>}</div>
          {editing && catalogError && <div className={styles.error} role="alert"><span>낚시대 가격표를 불러오지 못했습니다. 기존 견적과 직접 입력은 유지됩니다.</span><Button variant="secondary" onClick={retry}>가격표 다시 불러오기</Button></div>}
          {!record.items.length ? <div className={styles.card}><EmptyState title="견적 항목을 추가해주세요" /></div> : <div className={styles.detailTableScroll} role="region" aria-label="견적 항목 표 스크롤" tabIndex={0}>
            <table className={`${styles.detailItemsTable} ${record.items.some(isEquipmentItem) ? styles.mixedItemsTable : ""}`} aria-label="견적 항목">
              <thead><tr><th scope="col">규격 / 구성</th><th scope="col">수량</th><th scope="col">기준 단가</th><th scope="col">적용율</th><th scope="col">{modeLabel(record.mode)} 단가</th><th scope="col">{modeLabel(record.mode)}금액</th>{editing && <th scope="col">관리</th>}</tr></thead>
              {groups.map(group => <tbody key={group.key} aria-label={`${rodLabel(group.items[0])} 항목`}>
                <tr className={styles.detailGroupHeading}><th scope="rowgroup" colSpan={editing ? 7 : 6}><div><h3>{isEquipmentItem(group.items[0]) ? `[${group.items[0].categoryName}] ` : ""}{rodLabel(group.items[0])}</h3><div className={styles.detailGroupTools}><span>{quoteQuantityLabel(group.items)}</span>{editing && group.kind === "rod" && <Button variant="ghost" aria-label={`${group.fishingRodName} 칸수별 수정`} disabled={busy} onClick={() => editRodGroup(group.key, group.fishingRodId)}><Pencil size={14}/>칸수별 수정</Button>}</div></div></th></tr>
                {group.items.map(item => {
                  const index = record.items.indexOf(item);
                  return <tr key={index}>
                    <th scope="row">{specificationLabel(item) || "기본 규격"}<ItemConfiguration item={item}/></th><td>{item.quantity}{quoteItemUnit(item)}</td><td>{referenceMoney(item.unitPrice)}</td><td>{rateLabel(item.rate)}</td><td>{formatMoney(item.finalUnitPrice)}</td><td className={styles.detailLineAmount}>{formatMoney(item.finalUnitPrice * item.quantity)}</td>
                    {editing && <td><div className={styles.detailTableActions}><Button variant="ghost" aria-label={`${quoteItemName(item)} ${specificationLabel(item)} 항목 수정`} disabled={busy} onClick={() => isEquipmentItem(item) ? setEquipmentEditor({ index, item }) : setItemEditor({ index, item })}><Pencil size={15} /></Button><Button variant="ghost" aria-label={`${quoteItemName(item)} ${specificationLabel(item)} 항목 삭제`} disabled={busy} onClick={() => setEditing(current => current && ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><X size={16} /></Button></div></td>}
                  </tr>;
                })}
                <tr className={styles.detailGroupSubtotal}><td colSpan={editing ? 7 : 6}><PriceSummary summary={group} mode={record.mode} /></td></tr>
              </tbody>)}
            </table>
          </div>}
        </section>
        <section className={styles.card}><h2 className={styles.noteHeading}>메모</h2>{editing ? <Textarea aria-label="메모 (선택)" rows={4} maxLength={4000} value={record.note} onChange={event => setEditing(current => current && ({ ...current, note: event.target.value }))} /> : <p className={styles.noteText}>{record.note || "남긴 메모가 없습니다."}</p>}</section>
        <p className={styles.help}>저장 당시의 품목·선택 구성과 가격입니다. 제품이나 구성 설정이 변경되어도 기록된 견적은 유지됩니다.</p>
      </div>
      <aside className={`${styles.card} ${styles.summary}`}><h2>견적 합계</h2><p className={styles.summaryCount}>{groups.length}종 · {quoteQuantityLabel(record.items)}</p><strong className={styles.grandTotal}>{formatMoney(totals.totalPrice)}</strong><div className={styles.summaryOriginal}><span>총 가격</span><span>{referenceMoney(totals.totalOriginalPrice)}</span></div><div className={styles.summaryOriginal}><span>평균 적용율</span><span>{formatAppliedRate(totals.appliedRate)}</span></div>{!editing && <QuoteActions record={displayRecord} />}</aside>
    </div>
    {editing && <div className={styles.saveBar}><div><span>{quoteQuantityLabel(record.items)}</span><strong>{formatMoney(totals.totalPrice)}</strong></div><Button disabled={busy} onClick={save}>{busy ? "저장 중…" : "수정 내용 저장"}</Button></div>}
    {itemEditor && editing && <QuoteItemEditor item={itemEditor.item} mode={editing.mode} onClose={() => setItemEditor(null)} onApply={item => { setEditing(current => current && ({ ...current, items: itemEditor.index < 0 ? [...current.items, item] : current.items.map((value, index) => index === itemEditor.index ? item : value) })); setItemEditor(null); }} />}
    {rodPickerOpen && editing && <RodPicker mode={editing.mode} rods={rods} brands={brands} groups={[]} appendToQuote onClose={() => setRodPickerOpen(false)} onApply={addRod}/>}
    {rodGroupEditor && editing && <SavedRodGroupPicker editor={rodGroupEditor} onClose={() => setRodGroupEditor(null)} onApply={changes => { const items = applySavedRodGroupEditor(editing.items, rodGroupEditor, changes, editing.mode); setEditing(current => current && ({ ...current, items })); setRodGroupEditor(null); setError(""); }}/>}
    {equipmentEditor && editing && <EquipmentPicker mode={editing.mode} initial={equipmentEditor.item} onClose={() => setEquipmentEditor(null)} onApply={item => { const items = equipmentEditor.index < 0 ? appendQuoteItems(editing.items, [item]) : editing.items.map((value, index) => index === equipmentEditor.index ? item : value); setEditing(current => current && ({ ...current, items })); setEquipmentEditor(null); setError(""); }} />}
    {discard && <Modal title="변경사항을 버릴까요?" onClose={() => setDiscard(null)} footer={<><Button variant="secondary" onClick={() => setDiscard(null)}>계속 수정</Button><Button onClick={() => { const leavePage = discard === "leave"; setEditing(null); setBase(null); setError(""); setDiscard(null); if (leavePage) router.push("/quotes"); }}>변경사항 버리기</Button></>}><p>저장하지 않은 변경사항을 버립니다.</p></Modal>}
    {deleteOpen && <Modal title="견적 삭제" onClose={busy ? undefined : () => setDeleteOpen(false)} footer={<><Button variant="secondary" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "삭제 중…" : "삭제"}</Button></>}><p>「{record.title}」 견적을 삭제하시겠습니까? 삭제한 기록은 복구할 수 없습니다.</p></Modal>}
  </>;
}

function QuoteItemEditor({ item, mode, onClose, onApply }: { item?: RodQuoteItem; mode: CalculationMode; onClose: () => void; onApply: (item: RodQuoteItem) => void }) {
  const [name, setName] = useState(item?.fishingRodName ?? "");
  const [brand, setBrand] = useState(item?.brandName ?? "");
  const [length, setLength] = useState(String(item?.length ?? ""));
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [price, setPrice] = useState(String(item?.unitPrice ?? ""));
  const initialRate = String((item?.rate ?? .7) * 100);
  const [rate, setRate] = useState(initialRate);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedLength = Number(length), parsedQuantity = Number(quantity), parsedPrice = Number(price);
    const parsedRate = item && rate === initialRate ? item.rate : Number(rate) / 100;
    if (!name.trim() || !Number.isSafeInteger(parsedLength) || parsedLength <= 0 || !Number.isSafeInteger(parsedQuantity) || parsedQuantity <= 0 || price.trim() === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0 || !Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 1) { setError("낚시대명, 칸수, 수량, 가격과 적용율을 확인해주세요."); return; }
    const finalUnitPrice = item && parsedPrice === item.unitPrice && parsedRate === item.rate ? item.finalUnitPrice : adjustedUnitPrice(parsedPrice, parsedRate, mode);
    onApply({ fishingRodId: item?.fishingRodId ?? `manual-${crypto.randomUUID()}`, fishingRodName: name.trim(), brandName: brand.trim(), length: parsedLength, quantity: parsedQuantity, unitPrice: parsedPrice, rate: parsedRate, finalUnitPrice });
  }
  return <Modal title={item ? "견적 항목 수정" : "견적 항목 추가"} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>취소</Button><Button type="submit" form="quote-item">적용</Button></>}><form id="quote-item" onSubmit={submit}><Field label="낚시대 이름"><Input autoFocus required value={name} onChange={event => setName(event.target.value)} /></Field><Field label="브랜드 (선택)"><Input value={brand} onChange={event => setBrand(event.target.value)} /></Field><div className={styles.customerGrid}><Field label="칸수"><Input type="number" min={1} step={1} required value={length} onChange={event => setLength(event.target.value)} /></Field><Field label="수량"><Input type="number" min={1} step={1} required value={quantity} onChange={event => setQuantity(event.target.value)} /></Field><Field label="기준 단가 (원)"><Input type="number" min={0} step="any" required value={price} onChange={event => setPrice(event.target.value)} /></Field><Field label="적용율 (%)"><Input type="number" min={0} max={100} step="any" required value={rate} onChange={event => setRate(event.target.value)} /></Field></div><p className={styles.help}>가격이나 적용율을 바꿀 때 {mode === "purchase" ? "천 원 단위로 내립니다." : "천 원 단위로 올립니다."} 수량·이름만 수정하면 저장된 최종 단가를 유지합니다.</p>{error && <div className={styles.error} role="alert">{error}</div>}</form></Modal>;
}
