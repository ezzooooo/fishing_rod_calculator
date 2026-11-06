"use client";

import { useId, useState, type FormEvent } from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { groupQuoteItems, quoteItemName, quoteItemSpecification, quoteItemUnit, quoteQuantityLabel, type QuoteItem, type QuoteRecord } from "@/lib/domain";
import { formatDate, formatDateInput, formatDateTime, formatMoney } from "@/lib/format";
import { buildPurchaseOutcome, purchaseItemsMatch, purchaseOutcomeFor, purchaseSourceItems, purchaseStatusLabel, selectedPurchaseItems, type PurchaseOutcome, type PurchaseOutcomeInput, type PurchaseStatus } from "@/lib/purchase-outcome";
import { QuoteConflictError } from "@/lib/repository";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import styles from "./purchase-outcome.module.css";

const statuses: PurchaseStatus[] = ["unconfirmed", "in_progress", "completed", "partial", "not_completed"];
const reasons = ["가격 불일치", "고객 취소", "타업체 판매", "연락 두절", "기타"];
const isPurchased = (status: PurchaseStatus) => status === "completed" || status === "partial";
const specification = (item: QuoteItem) => quoteItemSpecification(item) || "기본 규격";
const itemLabel = (item: QuoteItem) => `${quoteItemName(item)} ${specification(item)}`;

function estimate(items: QuoteItem[], values: string[]): number | null {
  let total = 0;
  for (const [index, item] of items.entries()) {
    const value = values[index] ?? "";
    const quantity = value.trim() ? Number(value) : Number.NaN;
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > item.quantity) return null;
    total += item.finalUnitPrice * quantity;
  }
  return Number.isFinite(total) ? total : null;
}

export function PurchaseStatusBadge({ record }: { record: QuoteRecord }) {
  if (record.mode !== "purchase") return null;
  const status = purchaseOutcomeFor(record).status;
  return <span className={`${styles.badge} ${styles[status]}`}>{purchaseStatusLabel(status)}</span>;
}

function PurchasedItems({ outcome }: { outcome: PurchaseOutcome }) {
  const selected = selectedPurchaseItems(outcome);
  const groups = groupQuoteItems(outcome.quotedItems).filter(group => group.items.some(item => (outcome.quantities[outcome.quotedItems.indexOf(item)] ?? 0) > 0));
  return <details className={styles.purchasedItems} open={outcome.status === "partial"}>
    <summary>실제 매입 품목 · {quoteQuantityLabel(selected)}</summary>
    <div className={styles.tableScroll}><table className={styles.itemsTable} aria-label="실제 매입 품목">
      <thead><tr><th>품목 / 규격</th><th>견적 수량</th><th>매입 수량</th></tr></thead>
      {groups.map(group => <tbody key={group.key}><tr className={styles.groupRow}><th colSpan={3}>{group.brandName ? `[${group.brandName}] ` : ""}{group.name}</th></tr>{group.items.map(item => {
        const index = outcome.quotedItems.indexOf(item);
        const quantity = outcome.quantities[index] ?? 0;
        if (!quantity) return null;
        return <tr key={index}><th scope="row">{specification(item)}</th><td>{item.quantity}{quoteItemUnit(item)}</td><td><strong>{quantity}{quoteItemUnit(item)}</strong></td></tr>;
      })}</tbody>)}
    </table></div>
  </details>;
}

export function PurchaseOutcomePanel({ record, disabled = false, onSaved }: { record: QuoteRecord; disabled?: boolean; onSaved?: () => void }) {
  const [editing, setEditing] = useState<QuoteRecord | null>(null);
  if (record.mode !== "purchase") return null;
  const outcome = purchaseOutcomeFor(record);
  const purchased = isPurchased(outcome.status);
  const selected = purchased ? selectedPurchaseItems(outcome) : [];
  const sourceChanged = purchased && !purchaseItemsMatch(outcome.quotedItems, record.items);
  return <>
    <section className={styles.panel} aria-label="매입 진행 결과" data-testid="purchase-outcome-panel">
      <div className={styles.heading}><div><h2>매입 진행 결과</h2><PurchaseStatusBadge record={record} /></div><Button variant="secondary" disabled={disabled} onClick={() => setEditing(record)}><ClipboardCheck size={15} />{purchased || outcome.status === "not_completed" ? "매입 결과 수정" : "매입 결과 기록"}</Button></div>
      {purchased ? <>
        <dl className={styles.summary}><div><dt>견적 전체 금액</dt><dd>{formatMoney(record.totalPrice)}</dd></div><div><dt>실제 매입금액</dt><dd className={styles.actualAmount}>{formatMoney(outcome.actualAmount ?? 0)}</dd></div><div><dt>매입일</dt><dd>{outcome.purchasedOn ? formatDate(outcome.purchasedOn) : "—"}</dd></div><div><dt>매입 수량</dt><dd>{quoteQuantityLabel(selected)}</dd></div></dl>
        <PurchasedItems outcome={outcome} />
        {sourceChanged && <p className={styles.help}>견적 품목이 매입 기록 이후 수정됐습니다. 매입 내역은 기록 당시의 품목과 가격을 유지합니다.</p>}
      </> : <p className={styles.description}>{outcome.status === "unconfirmed" ? "아직 실제 매입 여부를 확인하지 않은 견적입니다." : outcome.status === "in_progress" ? "견적 전달 후 답변이나 방문을 기다리는 중입니다." : outcome.reason ? `미성사 사유: ${outcome.reason}` : "매입이 성사되지 않은 견적입니다."}</p>}
      {outcome.note && <p className={styles.note}>{outcome.note}</p>}
      {outcome.updatedAt && <p className={styles.updated}>결과 기록 {formatDateTime(outcome.updatedAt)}</p>}
    </section>
    {editing && <PurchaseOutcomeEditor record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved?.(); }} />}
  </>;
}

function PurchaseOutcomeEditor({ record, onClose, onSaved }: { record: QuoteRecord; onClose: () => void; onSaved: () => void }) {
  const { repository, notify } = useApp();
  const formId = useId();
  const saved = purchaseOutcomeFor(record);
  const [status, setStatus] = useState<PurchaseStatus>(saved.status);
  const [sourceItems, setSourceItems] = useState(() => purchaseSourceItems(record));
  const [quantities, setQuantities] = useState(() => sourceItems.map((_, index) => String(saved.quantities[index] ?? 0)));
  const [purchasedOn, setPurchasedOn] = useState(saved.purchasedOn ?? formatDateInput());
  const [amount, setAmount] = useState(saved.actualAmount === null ? "0" : String(saved.actualAmount));
  const [amountEdited, setAmountEdited] = useState(saved.actualAmount !== null);
  const [reason, setReason] = useState(saved.reason);
  const [note, setNote] = useState(saved.note);
  const [useCurrentQuoteItems, setUseCurrentQuoteItems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const purchased = isPurchased(status);
  const sourceChanged = saved.quotedItems.length > 0 && !purchaseItemsMatch(saved.quotedItems, record.items);
  const groups = groupQuoteItems(sourceItems);
  const estimated = estimate(sourceItems, quantities);
  const selected = sourceItems.flatMap((item, index) => {
    const quantity = Number(quantities[index]);
    return Number.isSafeInteger(quantity) && quantity > 0 ? [{ ...item, quantity }] : [];
  });
  function applyQuantities(next: string[]) {
    setQuantities(next);
    if (!amountEdited) {
      const nextAmount = estimate(sourceItems, next);
      setAmount(nextAmount === null ? "" : String(nextAmount));
    }
    setError("");
  }
  function changeStatus(next: PurchaseStatus) {
    setStatus(next);
    if (next === "completed") applyQuantities(sourceItems.map(item => String(item.quantity)));
    setError("");
  }
  function useCurrentItems() {
    const items = purchaseSourceItems(record, true);
    const values = items.map(item => status === "completed" ? String(item.quantity) : "0");
    setSourceItems(items); setQuantities(values); setUseCurrentQuoteItems(true); setAmountEdited(false);
    setAmount(String(estimate(items, values) ?? 0)); setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!repository || busy) return;
    const input: PurchaseOutcomeInput = {
      status, purchasedOn: purchased ? purchasedOn : null,
      actualAmount: purchased && amount.trim() ? Number(amount) : null,
      reason: status === "not_completed" ? reason : "", note,
      quantities: purchased ? quantities.map(value => value.trim() ? Number(value) : Number.NaN) : [],
      useCurrentQuoteItems,
    };
    try { buildPurchaseOutcome(record, input); } catch (failure) { setError(failure instanceof Error ? failure.message : "매입 결과를 확인해주세요."); return; }
    setBusy(true); setError("");
    try {
      await repository.updatePurchaseOutcome(record, input);
      notify("매입 결과를 저장했습니다.", "success"); onSaved();
    } catch (failure) {
      setError(failure instanceof QuoteConflictError ? "다른 직원이 견적이나 매입 결과를 수정했습니다. 이 창을 닫고 최신 내역에서 다시 기록해주세요." : failure instanceof Error ? failure.message : "매입 결과를 저장하지 못했습니다. 다시 시도해주세요.");
      setBusy(false);
    }
  }
  return <Modal wide title="매입 결과 기록" closeOnBackdrop={false} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button form={formId} type="submit" disabled={busy || !repository}>{busy ? "저장 중…" : "매입 결과 저장"}</Button></>}>
    <form id={formId} className={styles.form} onSubmit={save}>
      <div className={styles.topFields}><Field label="매입 진행 상태"><select className="control" value={status} disabled={busy} onChange={event => changeStatus(event.target.value as PurchaseStatus)}>{statuses.map(value => <option key={value} value={value}>{purchaseStatusLabel(value)}</option>)}</select></Field><div className={styles.quoteAmount}><span>원래 견적금액</span><strong>{formatMoney(record.totalPrice)}</strong></div></div>
      {purchased && <>
        {sourceChanged && !useCurrentQuoteItems && <div className={styles.sourceNotice}><p>견적 품목이 변경돼 현재는 기록 당시 품목을 보여줍니다. 현재 견적 품목으로 바꾸면 매입 수량과 금액을 다시 설정합니다.</p><Button variant="secondary" disabled={busy} onClick={useCurrentItems}><RotateCcw size={14} />현재 견적 품목으로 다시 선택</Button></div>}
        <div className={styles.selectionHeading}><div><h3>{status === "partial" ? "실제 매입한 품목과 수량" : "전체 품목 매입"}</h3><p>{status === "partial" ? "매입하지 않은 항목은 0으로 두세요. 일부 수량만 매입한 경우도 기록할 수 있습니다." : "견적에 담긴 모든 품목과 수량을 매입 완료로 기록합니다."}</p></div>{status === "partial" && <div><Button variant="ghost" disabled={busy} onClick={() => applyQuantities(sourceItems.map(item => String(item.quantity)))}>모두 선택</Button><Button variant="ghost" disabled={busy} onClick={() => applyQuantities(sourceItems.map(() => "0"))}>모두 해제</Button></div>}</div>
        <div className={`${styles.tableScroll} ${styles.selectionScroll}`}><table className={styles.itemsTable} aria-label="매입 품목 선택"><thead><tr><th>품목 / 규격</th><th>견적 수량</th><th>매입 수량</th></tr></thead>{groups.map(group => <tbody key={group.key}><tr className={styles.groupRow}><th colSpan={3}>{group.brandName ? `[${group.brandName}] ` : ""}{group.name}</th></tr>{group.items.map(item => {
          const index = sourceItems.indexOf(item);
          return <tr key={index}><th scope="row">{specification(item)}</th><td>{item.quantity}{quoteItemUnit(item)}</td><td>{status === "completed" ? <strong>{item.quantity}{quoteItemUnit(item)}</strong> : <Input aria-label={`${itemLabel(item)} 매입 수량`} data-testid={`purchase-quantity-${index}`} type="number" min={0} max={item.quantity} step={1} required disabled={busy} value={quantities[index] ?? "0"} onChange={event => applyQuantities(quantities.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />}</td></tr>;
        })}</tbody>)}</table></div>
        <div className={styles.selectionTotal}><span>선택 수량 <strong>{quoteQuantityLabel(selected)}</strong></span><span>선택 품목 견적금액 <strong>{estimated === null ? "—" : formatMoney(estimated)}</strong></span></div>
        <div className={styles.actualFields}><Field label="실제 매입금액 (원)"><Input type="number" min={0} step="any" required value={amount} disabled={busy} onChange={event => { setAmount(event.target.value); setAmountEdited(true); setError(""); }} /></Field><Field label="매입일"><Input type="date" required value={purchasedOn} disabled={busy} onChange={event => setPurchasedOn(event.target.value)} /></Field></div>
        <div className={styles.amountHelp}><p>협의 후 실제 지급한 총액을 기록합니다. 원래 견적금액과 견적서에는 반영되지 않습니다.</p><Button variant="ghost" disabled={busy || estimated === null} onClick={() => { setAmount(estimated === null ? "" : String(estimated)); setAmountEdited(false); }}>선택 수량 견적금액 적용</Button></div>
      </>}
      {status === "not_completed" && <Field label="미성사 사유 (선택)"><select className="control" disabled={busy} value={reason} onChange={event => setReason(event.target.value)}><option value="">사유 선택</option>{[...new Set([...reasons, ...(reason ? [reason] : [])])].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>}
      {isPurchased(saved.status) && !purchased && <p className={styles.sourceNotice}>이 상태로 저장하면 기존 매입 수량·금액·매입일을 비웁니다.</p>}
      <Field label="매입 결과 메모 (선택)"><Textarea rows={2} maxLength={2000} disabled={busy} value={note} placeholder="협의 내용이나 미성사 사유를 남겨주세요" onChange={event => setNote(event.target.value)} /></Field>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </Modal>;
}
