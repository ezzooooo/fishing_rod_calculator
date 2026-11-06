"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Building2, ChevronDown, Download, FileJson, Layers3, Pencil, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useEquipmentCatalog } from "@/lib/equipment-context";
import { availableLengths, normalizeBrand, normalizeFishingRod, priceForLength, type Brand, type FishingRod, type PriceMap } from "@/lib/domain";
import { brandKey, brandSearchText, matchesBrand, planBrandImport } from "@/lib/brands";
import { brandReviewPending, confirmedBrandRecommendations, userConfirmedBrandRecommendations, userConfirmedBrandReviewItems } from "@/lib/brand-recommendations";
import { formatDateTime, formatMoney } from "@/lib/format";
import { generateSteppedRodPrices } from "@/lib/rod-pricing";
import { Button, EmptyState, Field, Input, Modal, PageHeading, Textarea } from "@/components/ui";
import styles from "./catalog-workspace.module.css";

function CatalogStatus() {
  const { catalogLoading, catalogError, retry } = useApp();
  if (catalogLoading) return <div className={styles.notice} role="status">가격표를 불러오는 중입니다.</div>;
  if (catalogError) return <div className={`${styles.error} ${styles.statusError}`} role="alert"><span>가격표를 불러오지 못했습니다. 연결 상태와 직원 권한을 확인해주세요.</span><Button variant="secondary" onClick={retry}>다시 불러오기</Button></div>;
  return null;
}

function ConfirmDelete({ title, description, busy, onClose, onConfirm }: { title: string; description: string; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? "삭제 중…" : "삭제"}</Button></>}><p className={styles.confirmText}>{description}</p></Modal>;
}

export function BrandManagement() {
  const { brands, rods, repository, saveBrand, notify, catalogLoading, catalogError } = useApp();
  const { products } = useEquipmentCatalog();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Brand | "new" | null>(null);
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filtered = brands.filter((brand) => matchesBrand(brand, search));
  const importPlan = planBrandImport(brands, confirmedBrandRecommendations);
  const importable = importPlan.entries.filter((entry) => entry.action === "create" || entry.action === "update");
  const userReviewPlan = planBrandImport(brands, userConfirmedBrandRecommendations);
  const unresolved = new Map(userReviewPlan.entries.filter((entry) => entry.action !== "unchanged").map((entry) => [entry.name, entry]));
  const reviewItems = [...brandReviewPending, ...userConfirmedBrandReviewItems.filter((item) => unresolved.has(item.canonicalName)).map((item) => ({
    ...item,
    name: item.canonicalName,
    reason: unresolved.get(item.canonicalName)?.action === "conflict" ? unresolved.get(item.canonicalName)!.reason ?? "기존 브랜드의 중복을 확인해주세요." : "확정한 대표명과 별칭을 등록하면 이 목록에서 제거됩니다.",
  }))];
  const mergeGroups = importable.filter((entry) => entry.mergeIds?.length).length;
  const available = !!repository && !catalogLoading && !catalogError && !busy;
  const openEditor = (brand: Brand | "new") => { setEditor(brand); setName(brand === "new" ? "" : brand.name); setAliases(brand === "new" ? "" : (brand.aliases ?? []).join("\n")); setError(""); };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!repository || !editor || busy) return;
    if (!name.trim()) { setError("브랜드명을 입력해주세요."); return; }
    setBusy(true); setError("");
    try {
      const names = aliases.split(/[\n,，]/).map((value) => value.trim()).filter(Boolean);
      const saved = await saveBrand(editor === "new" ? null : editor.id, name.trim(), names);
      if (search.trim() && !matchesBrand(saved, search)) setSearch(saved.name);
      setEditor(null); notify("브랜드를 저장했습니다.", "success");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "브랜드를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  async function importConfirmed() {
    if (!repository || busy || !importable.length || catalogLoading || catalogError) return;
    setBusy(true); setError("");
    try {
      const result = await repository.importBrands(importable.map(({ name, aliases }) => ({ name, aliases })));
      setImporting(false);
      notify(`브랜드 ${result.created}개 추가, ${result.updated}개 표기·별칭을 반영했습니다.`, "success");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "브랜드를 등록하지 못했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!repository || !deleting || busy) return;
    setBusy(true);
    try { await repository.deleteBrand(deleting.id); setDeleting(null); notify("브랜드를 삭제했습니다.", "success"); }
    catch (failure) { setDeleting(null); notify(failure instanceof Error ? failure.message : "브랜드를 삭제하지 못했습니다. 다시 시도해주세요.", "error"); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="브랜드 관리" description="대표명과 별칭으로 낚시대·용품 브랜드를 함께 관리합니다." action={<><Button variant="secondary" onClick={() => { setImporting(true); setError(""); }} disabled={!available}><Upload size={16} />검토 브랜드 등록</Button><Button onClick={() => openEditor("new")} disabled={!available}><Plus size={17} />브랜드 추가</Button></>} />
    <CatalogStatus />
    <section className={styles.panel}>
      <div className={styles.toolbar}><div><strong>등록 브랜드</strong><span>{search ? `${filtered.length} / ${brands.length}` : brands.length}개</span></div><div className={styles.search}><Search size={17} /><Input aria-label="브랜드 검색" type="search" placeholder="대표명 또는 별칭 검색" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      {filtered.length ? <div className={styles.tableScroll}><table className={`${styles.table} ${styles.brandTable}`}><thead><tr><th>대표명 / 별칭</th><th>등록 제품</th><th className={styles.optional}>최근 변경</th><th className={styles.actionsHeading}>관리</th></tr></thead><tbody>{filtered.map((brand) => <tr key={brand.id}><td><strong>{brand.name}</strong>{!!brand.aliases?.length && <small className={styles.brandAliases}>별칭 {brand.aliases.join(" · ")}</small>}</td><td>{rods.filter((rod) => rod.brandId === brand.id).length + products.filter((product) => product.brandId === brand.id).length}종</td><td className={`${styles.muted} ${styles.optional}`}>{formatDateTime(brand.updatedAt || brand.createdAt) || "—"}</td><td><div className={styles.actions}><Button variant="ghost" aria-label={`${brand.name} 수정`} disabled={!available} onClick={() => openEditor(brand)}><Pencil size={15} /><span className={styles.actionLabel}>수정</span></Button><Button variant="ghost" className={styles.dangerAction} aria-label={`${brand.name} 삭제`} disabled={!available} onClick={() => setDeleting(brand)}><Trash2 size={15} /><span className={styles.srOnly}>삭제</span></Button></div></td></tr>)}</tbody></table></div> : !catalogLoading && !catalogError ? <EmptyState title={search ? "검색 결과가 없습니다" : "등록된 브랜드가 없습니다"} description={search ? "다른 대표명이나 별칭으로 검색해주세요." : "브랜드를 등록한 뒤 낚시대와 용품을 추가할 수 있습니다."} /> : null}
    </section>
    {!catalogLoading && !catalogError && (reviewItems.length ? <details className={styles.brandReview}>
      <summary><span>확인 필요 브랜드 <small>{reviewItems.length}묶음{unresolved.size > 0 ? " · 등록 대기" : " · 등록 제외"}</small></span><ChevronDown size={16} /></summary>
      <div className={styles.brandReviewIntro}>{unresolved.size > 0 ? "확정한 대표명을 검토 브랜드 등록에서 반영해주세요. 저장이 완료된 항목은 이 목록에서 자동으로 사라집니다." : "제품 라벨이나 제조사 표기를 확인한 뒤 대표명을 정해주세요. 아래 표기는 검토 브랜드 등록에 포함되지 않습니다."}</div>
      <div className={styles.tableScroll}><table className={`${styles.table} ${styles.reviewTable}`}><thead><tr><th>대표명 / 다른 표기</th><th>확인 내용</th><th>근거</th></tr></thead><tbody>{reviewItems.map((item) => <tr key={item.name}><td><strong>{item.name}</strong><small className={styles.brandAliases}>{item.aliases.join(" · ")}</small></td><td>{item.reason}</td><td><div className={styles.sourceLinks}>{item.exampleUrl && <a href={item.exampleUrl} target="_blank" rel="noreferrer">상품 보기</a>}{item.sourceUrls?.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">참고 {index + 1}</a>)}</div></td></tr>)}</tbody></table></div>
    </details> : <div className={styles.brandReviewComplete} role="status">확인 필요 브랜드 없음</div>)}
    {editor && <Modal title={editor === "new" ? "브랜드 추가" : "브랜드 수정"} onClose={busy ? undefined : () => setEditor(null)} footer={<><Button variant="secondary" disabled={busy} onClick={() => setEditor(null)}>취소</Button><Button type="submit" form="brand-editor" disabled={busy}>{busy ? "저장 중…" : "저장"}</Button></>}><form id="brand-editor" className={styles.editor} onSubmit={save}><Field label="브랜드명"><Input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="대표 브랜드명을 입력하세요" disabled={busy} /></Field><Field label="별칭 (선택)" hint="줄바꿈이나 쉼표로 구분해주세요. 별칭으로 검색해도 이 브랜드가 나옵니다."><Textarea rows={3} maxLength={6000} value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder={"예: 동일\n동일레져"} disabled={busy} /></Field>{error && <p className={styles.error} role="alert">{error}</p>}</form></Modal>}
    {importing && <Modal wide title="검토 브랜드 등록 확인" onClose={busy ? undefined : () => setImporting(false)} footer={<><Button variant="secondary" disabled={busy} onClick={() => setImporting(false)}>취소</Button><Button disabled={!available || !importable.length} onClick={importConfirmed}>{busy ? "등록 중…" : "확인 후 등록"}</Button></>}>
      <div className={styles.brandImportSummary}><strong>새 브랜드 {importPlan.created}개</strong><span>표기·별칭 보완 {importPlan.updated}개</span><span>이미 반영 {importPlan.unchanged}개</span>{mergeGroups > 0 && <span>중복 연결 {mergeGroups}묶음</span>}{importPlan.conflicts > 0 && <span className={styles.importConflict}>중복 확인 필요 {importPlan.conflicts}개 · 제외</span>}</div>
      <p className={styles.brandImportHint}>검토한 대표명과 별칭을 반영합니다. 기존 브랜드와 등록 제품의 연결은 유지하며, 같은 대표명의 중복은 원본을 보존해 연결합니다.</p>
      <div className={`${styles.tableScroll} ${styles.importTableScroll}`}><table className={`${styles.table} ${styles.importTable}`}><thead><tr><th>대표명</th><th>등록할 별칭</th><th>처리</th></tr></thead><tbody>{importPlan.entries.map((entry) => <tr key={entry.name}><td><strong>{entry.name}</strong></td><td>{entry.aliases.join(" · ") || "—"}</td><td><span className={entry.action === "conflict" ? styles.importConflict : styles.muted}>{entry.action === "create" ? "새로 등록" : entry.action === "update" ? entry.mergeIds?.length ? `중복 ${entry.mergeIds.length + 1}개 연결` : "기존 브랜드 보완" : entry.action === "unchanged" ? "이미 반영됨" : "중복 확인 후 등록"}</span>{entry.reason && <small className={styles.brandAliases}>{entry.reason}</small>}</td></tr>)}</tbody></table></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </Modal>}
    {deleting && <ConfirmDelete title="브랜드 삭제" description={`‘${deleting.name}’ 브랜드를 삭제할까요? 이 브랜드에 등록된 제품은 함께 삭제되지 않습니다. 저장된 견적도 유지됩니다.`} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}

type PriceInputs = Record<string, { purchase: string; sale: string }>;
function pricesForEditor(rod?: FishingRod): PriceInputs {
  return Object.fromEntries((rod ? availableLengths(rod) : []).map((length) => [String(length), { purchase: String(priceForLength(rod!, length, "purchase")), sale: String(priceForLength(rod!, length, "sale")) }]));
}
function RodEditor({ rod, onClose }: { rod?: FishingRod; onClose: () => void }) {
  const { brands, repository, notify } = useApp();
  const [name, setName] = useState(rod?.name ?? "");
  const [brandId, setBrandId] = useState(rod?.brandId ?? brands[0]?.id ?? "");
  const [prices, setPrices] = useState<PriceInputs>(() => pricesForEditor(rod));
  const [minimum, setMinimum] = useState(String(rod?.minValue ?? 18));
  const [maximum, setMaximum] = useState(String(rod?.maxValue ?? 60));
  const [customLength, setCustomLength] = useState("");
  const [bulkTarget, setBulkTarget] = useState("both");
  const [bulkLength, setBulkLength] = useState(() => rod ? String(availableLengths(rod)[0] ?? "") : "");
  const [bulkBase, setBulkBase] = useState("");
  const [bulkStep, setBulkStep] = useState("0");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [lengthToolsOpen, setLengthToolsOpen] = useState(!rod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lengths = Object.keys(prices).map(Number).sort((a, b) => a - b);
  const baseLength = lengths.includes(Number(bulkLength)) ? Number(bulkLength) : Number.NaN;
  const changePrice = (length: number, type: "purchase" | "sale", value: string) => setPrices((previous) => ({ ...previous, [length]: { ...previous[length], [type]: value } }));
  function applyRange() {
    const start = Number(minimum), end = Number(maximum);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 200 || start > end) { setError("칸수 범위는 1~200 사이에서 최소값부터 최대값 순서로 입력해주세요."); return; }
    const next: PriceInputs = {};
    for (let length = start; length <= end; length += 2) next[length] = prices[length] ?? { purchase: "", sale: "" };
    if (!next[bulkLength]) { setBulkLength(String(start)); setBulkBase(""); }
    setPrices(next); setError("");
  }
  function addLength() {
    const length = Number(customLength);
    if (!Number.isInteger(length) || length < 1 || length > 200) { setError("추가할 칸수를 1~200 사이의 정수로 입력해주세요."); return; }
    if (!lengths.length) setBulkLength(String(length));
    setPrices((previous) => ({ ...previous, [length]: previous[length] ?? { purchase: "", sale: "" } })); setCustomLength(""); setError("");
  }
  function removeLength(length: number) {
    setPrices(previous => { const next = { ...previous }; delete next[length]; return next; });
    if (length === baseLength) { setBulkLength(""); setBulkBase(""); }
    setError("");
  }
  function nextPrice(event: KeyboardEvent<HTMLInputElement>, length: number, type: "purchase" | "sale") {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const form = event.currentTarget.form;
    const nextLength = type === "purchase" ? length : lengths[lengths.indexOf(length) + 1];
    if (nextLength !== undefined) {
      form?.querySelector<HTMLInputElement>(`[data-price-length="${nextLength}"][data-price-type="${type === "purchase" ? "sale" : "purchase"}"]`)?.focus();
    } else {
      form?.ownerDocument.querySelector<HTMLButtonElement>('button[form="rod-editor"][type="submit"]')?.focus();
    }
  }
  function resetPrices() {
    setPrices({}); setMinimum(""); setMaximum(""); setCustomLength("");
    setBulkLength(""); setBulkBase(""); setBulkStep(""); setBulkTarget("both");
    setError(""); setResetConfirm(false); setLengthToolsOpen(true);
  }
  function applyBulk() {
    try {
      if (!bulkBase.trim() || !bulkStep.trim()) throw new Error("기준 금액과 칸수별 가격 차이를 입력해주세요. 같은 가격으로 설정하려면 가격 차이를 0원으로 입력하세요.");
      const generated = generateSteppedRodPrices(lengths, baseLength, Number(bulkBase), Number(bulkStep));
      setPrices(previous => Object.fromEntries(lengths.map(length => [length, {
        purchase: bulkTarget !== "sale" ? String(generated[length]) : previous[length].purchase,
        sale: bulkTarget !== "purchase" ? String(generated[length]) : previous[length].sale,
      }])));
      setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "가격 자동 설정 값을 확인해주세요."); }
  }
  function changeBulkLength(value: string) {
    setBulkLength(value);
    setBulkBase(prices[value]?.[bulkTarget === "sale" ? "sale" : "purchase"] ?? "");
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!repository || busy) return;
    if (!name.trim() || !brandId || !lengths.length) { setError("브랜드, 낚시대명과 한 개 이상의 칸수를 입력해주세요."); return; }
    const purchase: PriceMap = {}, sale: PriceMap = {};
    for (const length of lengths) {
      const input = prices[length], purchasePrice = Number(input.purchase), salePrice = Number(input.sale);
      if (!input.purchase.trim() || !input.sale.trim() || !Number.isFinite(purchasePrice) || !Number.isFinite(salePrice) || purchasePrice < 0 || salePrice < 0) { setError(`${length}칸의 매입가와 판매가를 0 이상으로 입력해주세요.`); return; }
      purchase[length] = purchasePrice; sale[length] = salePrice;
    }
    setBusy(true); setError("");
    try {
      await repository.saveRod({ id: rod?.id ?? crypto.randomUUID(), name: name.trim(), brandId, minValue: lengths[0], maxValue: lengths[lengths.length - 1], usedPrice: Object.values(sale).reduce((total, price) => total + price, 0) / lengths.length, lengthPrices: sale, purchaseLengthPrices: purchase, saleLengthPrices: sale, createdAt: rod?.createdAt ?? new Date().toISOString(), updatedAt: rod ? new Date().toISOString() : null });
      notify("낚시대 가격표를 저장했습니다.", "success"); onClose();
    } catch { setError("가격표를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  return <Modal wide title={rod ? "낚시대 수정" : "낚시대 추가"} closeOnBackdrop={false} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>취소</Button><Button type="submit" form="rod-editor" disabled={busy || !brands.length}>{busy ? "저장 중…" : "가격표 저장"}</Button></>}>
    <form id="rod-editor" className={styles.editor} onSubmit={save} onKeyDown={event => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) event.preventDefault();
    }}>
      <div className={styles.twoColumns}><Field label="브랜드"><select required value={brandId} onChange={(event) => setBrandId(event.target.value)} disabled={busy}><option value="">브랜드 선택</option>{rod && !brands.some((brand) => brand.id === rod.brandId) && <option value={rod.brandId}>삭제된 브랜드 ({rod.brandId})</option>}{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field><Field label="낚시대명"><Input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} placeholder="낚시대 이름" /></Field></div>
      <div className={styles.editorTools}><details className={styles.toolDisclosure} open={lengthToolsOpen} onToggle={event => setLengthToolsOpen(event.currentTarget.open)}><summary><span>칸수 구성 <small>{lengths.length}개 선택</small></span><ChevronDown size={15} /></summary><div className={styles.toolContent}><p className={styles.toolHint}>범위는 2칸 간격으로 추가합니다.</p><div className={styles.rangeRow}><Field label="최소 칸수"><Input type="number" min={1} max={200} step={1} value={minimum} onChange={(event) => setMinimum(event.target.value)} disabled={busy} /></Field><Field label="최대 칸수"><Input type="number" min={1} max={200} step={1} value={maximum} onChange={(event) => setMaximum(event.target.value)} disabled={busy} /></Field><Button variant="secondary" type="button" disabled={busy} onClick={applyRange}>범위 적용</Button></div><div className={styles.customLength}><Input aria-label="개별 칸수" placeholder="개별 칸수" type="number" min={1} max={200} step={1} value={customLength} onChange={(event) => setCustomLength(event.target.value)} disabled={busy} /><Button variant="secondary" type="button" disabled={busy} onClick={addLength}><Plus size={15} />칸수 추가</Button></div></div></details>
      <details className={styles.toolDisclosure} open={!rod}><summary><span><span>가격 일괄 입력</span> <small>기준 칸수로 자동 설정</small></span><ChevronDown size={15} /></summary><div className={styles.toolContent}><p className={styles.toolHint}>기준 칸수보다 긴 칸수는 더하고, 짧은 칸수는 뺍니다. 선택한 칸수의 순서마다 가격 차이를 적용하며, 0원 미만은 0원으로 설정합니다.</p><div className={styles.bulkGrid}><Field label="적용 대상"><select value={bulkTarget} onChange={(event) => setBulkTarget(event.target.value)} disabled={busy}><option value="both">매입가·판매가</option><option value="purchase">매입가</option><option value="sale">판매가</option></select></Field><Field label="기준 칸수"><select value={Number.isFinite(baseLength) ? String(baseLength) : ""} onChange={event => changeBulkLength(event.target.value)} disabled={busy || !lengths.length}>{!Number.isFinite(baseLength) && <option value="">{lengths.length ? "기준 칸수를 선택하세요" : "칸수를 먼저 추가하세요"}</option>}{lengths.map(length => <option key={length} value={length}>{length}칸</option>)}</select></Field><Field label="기준 금액"><Input type="number" min={0} step="any" value={bulkBase} onChange={(event) => setBulkBase(event.target.value)} placeholder="원" disabled={busy} /></Field><Field label="칸수별 가격 차이"><Input type="number" min={0} step="any" value={bulkStep} onChange={(event) => setBulkStep(event.target.value)} disabled={busy} /></Field></div><Button variant="secondary" type="button" onClick={applyBulk} disabled={busy || !lengths.length}>선택 칸수에 적용</Button></div></details></div>
      <div className={styles.priceHeading}><div><h3>칸수별 가격표</h3><span>가격 입력 후 Enter: 다음 가격 · 마지막 입력 후 저장 버튼으로 이동</span></div><Button variant="ghost" disabled={busy} onClick={() => setResetConfirm(true)}><RotateCcw size={14} />칸수·가격 초기화</Button></div>
      {resetConfirm && <div className={styles.resetPrices} role="group" aria-label="칸수·가격 초기화 확인"><p>선택한 칸수와 가격을 모두 비울까요? 브랜드와 낚시대명은 유지합니다.</p><div><Button variant="secondary" disabled={busy} onClick={() => setResetConfirm(false)}>초기화 취소</Button><Button variant="danger" disabled={busy} onClick={resetPrices}>모두 초기화</Button></div></div>}
      {lengths.length ? <div className={`${styles.tableScroll} ${styles.priceTableScroll}`}><table className={`${styles.table} ${styles.priceTable}`}><thead><tr><th>칸수</th><th>매입가 (원)</th><th>판매가 (원)</th><th><span className={styles.srOnly}>칸수 삭제</span></th></tr></thead><tbody>{lengths.map((length) => <tr key={length}><th scope="row">{length}칸</th><td><Input aria-label={`${length}칸 매입가`} data-price-length={length} data-price-type="purchase" type="number" required min={0} step="any" value={prices[length].purchase} onKeyDown={event => nextPrice(event, length, "purchase")} onChange={(event) => changePrice(length, "purchase", event.target.value)} disabled={busy} /></td><td><Input aria-label={`${length}칸 판매가`} data-price-length={length} data-price-type="sale" type="number" required min={0} step="any" value={prices[length].sale} onKeyDown={event => nextPrice(event, length, "sale")} onChange={(event) => changePrice(length, "sale", event.target.value)} disabled={busy} /></td><td><Button variant="ghost" type="button" aria-label={`${length}칸 삭제`} disabled={busy} onClick={() => removeLength(length)}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div> : <div className={styles.notice}>범위를 적용하거나 칸수를 개별 추가해주세요.</div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  </Modal>;
}

export function RodManagement() {
  const { rods, brands, repository, notify, catalogLoading, catalogError } = useApp();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [editor, setEditor] = useState<FishingRod | "new" | null>(null);
  const [deleting, setDeleting] = useState<FishingRod | null>(null);
  const [busy, setBusy] = useState(false);
  const brandName = (id: string) => brands.find((brand) => brand.id === id)?.name ?? "삭제된 브랜드";
  const filtered = rods.filter((rod) => {
    const brand = brands.find((value) => value.id === rod.brandId);
    return (!brandFilter || rod.brandId === brandFilter) && brandKey(`${rod.name} ${brand ? brandSearchText(brand) : brandName(rod.brandId)}`).includes(brandKey(search.trim()));
  });
  function priceRange(rod: FishingRod, mode: "purchase" | "sale") { const prices = availableLengths(rod).map((length) => priceForLength(rod, length, mode)); if (!prices.length) return "—"; const minimum = Math.min(...prices), maximum = Math.max(...prices); return minimum === maximum ? formatMoney(minimum) : `${formatMoney(minimum)} ~ ${formatMoney(maximum)}`; }
  async function remove() {
    if (!repository || !deleting || busy) return;
    setBusy(true);
    try { await repository.deleteRod(deleting.id); setDeleting(null); notify("낚시대를 삭제했습니다.", "success"); }
    catch { setDeleting(null); notify("낚시대를 삭제하지 못했습니다. 다시 시도해주세요.", "error"); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="낚시대 관리" description="낚시대 종류와 칸수별 매입·판매 가격을 관리합니다." action={<Button onClick={() => setEditor("new")} disabled={!repository || !brands.length}><Plus size={17} />낚시대 추가</Button>} />
    <CatalogStatus />
    {!brands.length && !catalogLoading && <div className={styles.notice}>낚시대를 추가하려면 먼저 브랜드를 등록해주세요.</div>}
    <section className={styles.panel}><div className={styles.toolbar}><div><strong>등록 낚시대</strong><span>{search || brandFilter ? `${filtered.length} / ${rods.length}` : rods.length}종</span></div><div className={styles.filters}><select aria-label="브랜드 필터" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}><option value="">모든 브랜드</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><div className={styles.search}><Search size={17} /><Input aria-label="낚시대 검색" type="search" placeholder="낚시대 또는 브랜드명" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></div>
      {filtered.length ? <div className={styles.tableScroll}><table className={`${styles.table} ${styles.rodTable}`}><thead><tr><th>브랜드</th><th>낚시대</th><th>칸수 구성</th><th>매입가</th><th>판매가</th><th className={styles.actionsHeading}>관리</th></tr></thead><tbody>{filtered.map((rod) => { const lengths = availableLengths(rod); return <tr key={rod.id}>
        <td className={styles.rodBrand}><span className={styles.brandLabel}>{brandName(rod.brandId)}</span></td>
        <td className={styles.rodName}><button type="button" onClick={() => setEditor(rod)} disabled={!repository}>{rod.name}</button></td>
        <td className={styles.rodLengths}><span>{lengths.length}개</span>{lengths.length ? <small>{lengths[0]}–{lengths[lengths.length - 1]}칸</small> : null}</td>
        <td className={styles.rodPrice} data-label="매입가">{priceRange(rod, "purchase")}</td>
        <td className={styles.rodPrice} data-label="판매가">{priceRange(rod, "sale")}</td>
        <td className={styles.rodActions}><div className={styles.actions}><Button variant="ghost" aria-label={`${rod.name} 수정`} disabled={!repository} onClick={() => setEditor(rod)}><Pencil size={15} /><span className={styles.actionLabel}>수정</span></Button><Button variant="ghost" className={styles.dangerAction} aria-label={`${rod.name} 삭제`} disabled={!repository} onClick={() => setDeleting(rod)}><Trash2 size={15} /><span className={styles.srOnly}>삭제</span></Button></div></td>
      </tr>; })}</tbody></table></div> : !catalogLoading && !catalogError ? <EmptyState title={search || brandFilter ? "검색 결과가 없습니다" : "등록된 낚시대가 없습니다"} description={search || brandFilter ? "검색어나 브랜드 필터를 바꿔보세요." : "낚시대와 칸수별 가격표를 등록해주세요."} /> : null}
    </section>
    {editor && <RodEditor rod={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
    {deleting && <ConfirmDelete title="낚시대 삭제" description={`‘${deleting.name}’ 낚시대를 삭제할까요? 저장된 견적의 이름과 당시 가격은 유지됩니다.`} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}

function asRecord(value: unknown, label: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: 객체 형식이어야 합니다.`); return value as Record<string, unknown>; }
function validText(value: unknown, label: string, maximum = 120): string { if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) throw new Error(`${label}: 1~${maximum}자의 문자열을 입력해주세요.`); return value.trim(); }
function validId(value: unknown, label: string): string { const id = validText(value, label, 256); if (id.includes("/")) throw new Error(`${label}: ID에는 /를 사용할 수 없습니다.`); return id; }
function validateDates(value: Record<string, unknown>, label: string) { for (const key of ["createdAt", "updatedAt"]) { const date = value[key]; if (date !== undefined && date !== null && (typeof date !== "string" || !Number.isFinite(new Date(date).getTime()))) throw new Error(`${label}: ${key} 날짜 형식을 확인해주세요.`); } }
function validatePriceMap(value: unknown, label: string) { if (value === undefined || value === null) return; const entries = asRecord(value, label); for (const [key, price] of Object.entries(entries)) { const length = Number(key); if (!/^[1-9]\d*$/.test(key) || !Number.isInteger(length) || length < 1 || length > 200 || typeof price !== "number" || !Number.isFinite(price) || price < 0) throw new Error(`${label}: 칸수는 1~200, 가격은 0 이상의 숫자여야 합니다.`); } }
function parseBrands(value: unknown): Brand[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error("브랜드 데이터는 5,000개 이하의 JSON 배열이어야 합니다.");
  const ids = new Set<string>();
  return value.map((raw, index) => { const label = `${index + 1}번째 브랜드`, data = asRecord(raw, label), id = validId(data.id, label); validText(data.name, `${label} 이름`); validateDates(data, label); if (ids.has(id)) throw new Error(`브랜드 ID ‘${id}’가 중복되어 있습니다.`); ids.add(id); return normalizeBrand({ ...data, id, name: validText(data.name, `${label} 이름`) }); });
}
function parseRods(value: unknown, brands: Brand[]): FishingRod[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error("낚시대 데이터는 5,000개 이하의 JSON 배열이어야 합니다.");
  const ids = new Set<string>(), brandIds = new Set(brands.map((brand) => brand.id));
  return value.map((raw, index) => {
    const label = `${index + 1}번째 낚시대`, data = asRecord(raw, label), id = validId(data.id, label), brandId = validId(data.brandId, `${label} 브랜드`);
    validText(data.name, `${label} 이름`); validateDates(data, label);
    if (ids.has(id)) throw new Error(`낚시대 ID ‘${id}’가 중복되어 있습니다.`); ids.add(id);
    if (!brandIds.has(brandId)) throw new Error(`${label}: 브랜드 ‘${brandId}’를 먼저 불러오거나 등록해주세요.`);
    const minimum = data.minValue, maximum = data.maxValue;
    if (typeof minimum !== "number" || typeof maximum !== "number" || !Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 1 || maximum > 200 || minimum > maximum) throw new Error(`${label}: 칸수 범위를 1~200 사이에서 확인해주세요.`);
    if (data.usedPrice !== undefined && (typeof data.usedPrice !== "number" || !Number.isFinite(data.usedPrice) || data.usedPrice < 0)) throw new Error(`${label}: 기준 가격은 0 이상의 숫자여야 합니다.`);
    for (const field of ["lengthPrices", "purchaseLengthPrices", "saleLengthPrices", "purchasePrices", "salePrices"]) validatePriceMap(data[field], `${label} ${field}`);
    return normalizeFishingRod({ ...data, id, brandId, name: validText(data.name, `${label} 이름`) });
  });
}

type PendingImport = { kind: "brands"; source: string; records: Brand[] } | { kind: "rods"; source: string; records: FishingRod[] };
function downloadJson(name: string, records: Brand[] | FishingRod[]) { const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: "application/json;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${name}-${Date.now()}.json`; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export function SystemSettings() {
  const { isAdmin, isDemo, brands, rods, repository, notify, catalogLoading } = useApp();
  const brandFile = useRef<HTMLInputElement>(null), rodFile = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function prepare(kind: "brands" | "rods", value: unknown, source: string) { setPending(kind === "brands" ? { kind, source, records: parseBrands(value) } : { kind, source, records: parseRods(value, brands) }); setError(""); }
  async function readFile(kind: "brands" | "rods", file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try { if (file.size > 10 * 1024 * 1024) throw new Error("10MB 이하의 JSON 파일을 선택해주세요."); prepare(kind, JSON.parse(await file.text()), file.name); }
    catch (error) { setError(error instanceof SyntaxError ? "JSON 파일 형식이 올바르지 않습니다." : error instanceof Error ? error.message : "파일을 읽지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function loadDefaults(kind: "brands" | "rods") {
    setBusy(true); setError("");
    try { const response = await fetch(`/defaults/${kind === "brands" ? "brands" : "fishing_rods"}.json`); if (!response.ok) throw new Error("기본 데이터 파일을 불러오지 못했습니다."); prepare(kind, await response.json(), kind === "brands" ? "기본 브랜드 데이터" : "기본 낚시대 데이터"); }
    catch (error) { setError(error instanceof Error ? error.message : "기본 데이터를 불러오지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function replace() {
    if (!repository || !pending || busy) return;
    setBusy(true); setError("");
    try { if (pending.kind === "brands") await repository.replaceBrands(pending.records); else await repository.replaceRods(pending.records); notify(`${pending.kind === "brands" ? "브랜드" : "낚시대"} ${pending.records.length}개를 불러왔습니다.`, "success"); setPending(null); }
    catch { setError("데이터를 교체하지 못했습니다. 연결 상태와 직원 권한을 확인한 뒤 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  if (!isAdmin) return <EmptyState title="접근 권한이 없습니다" description="시스템 설정은 관리자 계정에서 사용할 수 있습니다." />;
  return <>
    <PageHeading title="시스템 설정" description="브랜드와 낚시대 가격표를 백업하거나 JSON 파일에서 불러옵니다." />
    <CatalogStatus />
    {isDemo && <div className={styles.notice}>미리보기에서는 예시 데이터에만 적용됩니다.</div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.settingsGrid}>
      <section className={styles.settingsCard}><div className={styles.settingsHead}><div className={styles.settingsIcon}><Building2 size={20} /></div><div><h2>브랜드 데이터</h2><p>등록 브랜드 <strong>{brands.length}개</strong></p></div></div><div className={styles.settingsActions}><Button variant="secondary" disabled={busy || catalogLoading} onClick={() => { downloadJson("brands", brands); notify("브랜드 백업 파일을 저장했습니다.", "success"); }}><Download size={16} />브랜드 내보내기</Button><Button variant="secondary" disabled={busy || !repository} onClick={() => brandFile.current?.click()}><Upload size={16} />브랜드 JSON 불러오기</Button><Button variant="ghost" disabled={busy || !repository} onClick={() => loadDefaults("brands")}><FileJson size={16} />기본 브랜드 불러오기</Button></div></section>
      <section className={styles.settingsCard}><div className={styles.settingsHead}><div className={styles.settingsIcon}><Layers3 size={20} /></div><div><h2>낚시대 데이터</h2><p>등록 낚시대 <strong>{rods.length}종</strong></p></div></div><div className={styles.settingsActions}><Button variant="secondary" disabled={busy || catalogLoading} onClick={() => { downloadJson("fishing-rods", rods); notify("낚시대 백업 파일을 저장했습니다.", "success"); }}><Download size={16} />낚시대 내보내기</Button><Button variant="secondary" disabled={busy || !repository} onClick={() => rodFile.current?.click()}><Upload size={16} />낚시대 JSON 불러오기</Button><Button variant="ghost" disabled={busy || !repository} onClick={() => loadDefaults("rods")}><FileJson size={16} />기본 낚시대 불러오기</Button></div></section>
    </div>
    <div className={styles.importHelp}><FileJson size={20} /><div><strong>불러오기는 현재 가격표를 교체합니다.</strong><p>먼저 내보내기로 백업해주세요. 파일 검증 후 교체할 개수를 확인하고 적용합니다. 저장된 견적 내역은 가격표 교체의 영향을 받지 않습니다.</p></div></div>
    <input ref={brandFile} className={styles.hiddenInput} type="file" accept=".json,application/json" aria-label="브랜드 JSON 파일" onChange={(event) => { void readFile("brands", event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={rodFile} className={styles.hiddenInput} type="file" accept=".json,application/json" aria-label="낚시대 JSON 파일" onChange={(event) => { void readFile("rods", event.target.files?.[0]); event.target.value = ""; }} />
    {pending && <Modal title={`${pending.kind === "brands" ? "브랜드" : "낚시대"} 데이터 교체`} onClose={busy ? undefined : () => setPending(null)} footer={<><Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>취소</Button><Button variant="danger" disabled={busy} onClick={replace}>{busy ? "교체 중…" : "기존 데이터 교체"}</Button></>}><div className={styles.confirmText}><p><strong>{pending.source}</strong>의 {pending.records.length}개 항목을 불러옵니다.</p><p>현재 {pending.kind === "brands" ? brands.length : rods.length}개 항목을 모두 교체합니다. 이 작업은 되돌릴 수 없습니다.</p>{!pending.records.length && <p className={styles.error}>선택한 파일이 비어 있어 현재 데이터가 모두 삭제됩니다.</p>}{error && <p className={styles.error} role="alert">{error}</p>}</div></Modal>}
  </>;
}
