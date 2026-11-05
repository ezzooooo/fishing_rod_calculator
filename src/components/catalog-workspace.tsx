"use client";

import { useRef, useState, type FormEvent } from "react";
import { Building2, ChevronDown, Download, FileJson, Layers3, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useEquipmentCatalog } from "@/lib/equipment-context";
import { availableLengths, normalizeBrand, normalizeFishingRod, priceForLength, type Brand, type FishingRod, type PriceMap } from "@/lib/domain";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button, EmptyState, Field, Input, Modal, PageHeading } from "@/components/ui";
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
  const { brands, rods, repository, notify, catalogLoading, catalogError } = useApp();
  const { products } = useEquipmentCatalog();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Brand | "new" | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filtered = brands.filter((brand) => brand.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const openEditor = (brand: Brand | "new") => { setEditor(brand); setName(brand === "new" ? "" : brand.name); setError(""); };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!repository || !editor || busy) return;
    if (!name.trim()) { setError("브랜드명을 입력해주세요."); return; }
    setBusy(true); setError("");
    try {
      if (editor === "new") await repository.createBrand(name.trim());
      else await repository.updateBrand(editor.id, name.trim());
      setEditor(null); notify("브랜드를 저장했습니다.", "success");
    } catch { setError("브랜드를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!repository || !deleting || busy) return;
    setBusy(true);
    try { await repository.deleteBrand(deleting.id); setDeleting(null); notify("브랜드를 삭제했습니다.", "success"); }
    catch { setDeleting(null); notify("브랜드를 삭제하지 못했습니다. 다시 시도해주세요.", "error"); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="브랜드 관리" description="낚시대와 용품에 함께 사용할 브랜드를 관리합니다." action={<Button onClick={() => openEditor("new")} disabled={!repository}><Plus size={17} />브랜드 추가</Button>} />
    <CatalogStatus />
    <section className={styles.panel}>
      <div className={styles.toolbar}><div><strong>등록 브랜드</strong><span>{search ? `${filtered.length} / ${brands.length}` : brands.length}개</span></div><div className={styles.search}><Search size={17} /><Input aria-label="브랜드 검색" type="search" placeholder="브랜드명 검색" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      {filtered.length ? <div className={styles.tableScroll}><table className={`${styles.table} ${styles.brandTable}`}><thead><tr><th>브랜드명</th><th>등록 제품</th><th className={styles.optional}>최근 변경</th><th className={styles.actionsHeading}>관리</th></tr></thead><tbody>{filtered.map((brand) => <tr key={brand.id}><td><strong>{brand.name}</strong></td><td>{rods.filter((rod) => rod.brandId === brand.id).length + products.filter((product) => product.brandId === brand.id).length}종</td><td className={`${styles.muted} ${styles.optional}`}>{formatDateTime(brand.updatedAt || brand.createdAt) || "—"}</td><td><div className={styles.actions}><Button variant="ghost" aria-label={`${brand.name} 수정`} disabled={!repository} onClick={() => openEditor(brand)}><Pencil size={15} /><span className={styles.actionLabel}>수정</span></Button><Button variant="ghost" className={styles.dangerAction} aria-label={`${brand.name} 삭제`} disabled={!repository} onClick={() => setDeleting(brand)}><Trash2 size={15} /><span className={styles.srOnly}>삭제</span></Button></div></td></tr>)}</tbody></table></div> : !catalogLoading && !catalogError ? <EmptyState title={search ? "검색 결과가 없습니다" : "등록된 브랜드가 없습니다"} description={search ? "다른 브랜드명으로 검색해주세요." : "브랜드를 등록한 뒤 낚시대와 용품을 추가할 수 있습니다."} /> : null}
    </section>
    {editor && <Modal title={editor === "new" ? "브랜드 추가" : "브랜드 수정"} onClose={busy ? undefined : () => setEditor(null)} footer={<><Button variant="secondary" disabled={busy} onClick={() => setEditor(null)}>취소</Button><Button type="submit" form="brand-editor" disabled={busy}>{busy ? "저장 중…" : "저장"}</Button></>}><form id="brand-editor" onSubmit={save}><Field label="브랜드명"><Input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="브랜드명을 입력하세요" disabled={busy} /></Field>{error && <p className={styles.error} role="alert">{error}</p>}</form></Modal>}
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
  const [bulkBase, setBulkBase] = useState("");
  const [bulkStep, setBulkStep] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lengths = Object.keys(prices).map(Number).sort((a, b) => a - b);
  const changePrice = (length: number, type: "purchase" | "sale", value: string) => setPrices((previous) => ({ ...previous, [length]: { ...previous[length], [type]: value } }));
  function applyRange() {
    const start = Number(minimum), end = Number(maximum);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 200 || start > end) { setError("칸수 범위는 1~200 사이에서 최소값부터 최대값 순서로 입력해주세요."); return; }
    const next: PriceInputs = {};
    for (let length = start; length <= end; length += 2) next[length] = prices[length] ?? { purchase: "", sale: "" };
    setPrices(next); setError("");
  }
  function addLength() {
    const length = Number(customLength);
    if (!Number.isInteger(length) || length < 1 || length > 200) { setError("추가할 칸수를 1~200 사이의 정수로 입력해주세요."); return; }
    setPrices((previous) => ({ ...previous, [length]: previous[length] ?? { purchase: "", sale: "" } })); setCustomLength(""); setError("");
  }
  function applyBulk() {
    const base = Number(bulkBase), step = Number(bulkStep);
    if (!lengths.length || !bulkBase.trim() || !Number.isFinite(base) || base < 0 || !Number.isFinite(step) || step < 0 || lengths.some((_, index) => !Number.isFinite(base + index * step))) { setError("칸수를 먼저 선택하고 기준 금액과 증가 금액을 0 이상으로 입력해주세요."); return; }
    const next = { ...prices };
    lengths.forEach((length, index) => { const value = String(base + index * step); next[length] = { purchase: bulkTarget !== "sale" ? value : prices[length].purchase, sale: bulkTarget !== "purchase" ? value : prices[length].sale }; });
    setPrices(next); setError("");
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
  return <Modal wide title={rod ? "낚시대 수정" : "낚시대 추가"} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>취소</Button><Button type="submit" form="rod-editor" disabled={busy || !brands.length}>{busy ? "저장 중…" : "가격표 저장"}</Button></>}>
    <form id="rod-editor" className={styles.editor} onSubmit={save}>
      <div className={styles.twoColumns}><Field label="브랜드"><select required value={brandId} onChange={(event) => setBrandId(event.target.value)} disabled={busy}><option value="">브랜드 선택</option>{rod && !brands.some((brand) => brand.id === rod.brandId) && <option value={rod.brandId}>삭제된 브랜드 ({rod.brandId})</option>}{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field><Field label="낚시대명"><Input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} placeholder="낚시대 이름" /></Field></div>
      <div className={styles.editorTools}><details className={styles.toolDisclosure} open={!rod}><summary><span>칸수 구성 <small>{lengths.length}개 선택</small></span><ChevronDown size={15} /></summary><div className={styles.toolContent}><p className={styles.toolHint}>범위는 2칸 간격으로 추가합니다.</p><div className={styles.rangeRow}><Field label="최소 칸수"><Input type="number" min={1} max={200} step={1} value={minimum} onChange={(event) => setMinimum(event.target.value)} disabled={busy} /></Field><Field label="최대 칸수"><Input type="number" min={1} max={200} step={1} value={maximum} onChange={(event) => setMaximum(event.target.value)} disabled={busy} /></Field><Button variant="secondary" type="button" disabled={busy} onClick={applyRange}>범위 적용</Button></div><div className={styles.customLength}><Input aria-label="개별 칸수" placeholder="개별 칸수" type="number" min={1} max={200} step={1} value={customLength} onChange={(event) => setCustomLength(event.target.value)} disabled={busy} /><Button variant="secondary" type="button" disabled={busy} onClick={addLength}><Plus size={15} />칸수 추가</Button></div></div></details>
      <details className={styles.toolDisclosure}><summary><span>가격 일괄 입력</span><ChevronDown size={15} /></summary><div className={styles.toolContent}><p className={styles.toolHint}>칸수 순서대로 기준 금액에 증가 금액을 더합니다. 같은 가격은 증가 금액을 0원으로 입력하세요.</p><div className={styles.bulkGrid}><Field label="적용 대상"><select value={bulkTarget} onChange={(event) => setBulkTarget(event.target.value)} disabled={busy}><option value="both">매입가·판매가</option><option value="purchase">매입가</option><option value="sale">판매가</option></select></Field><Field label="기준 금액"><Input type="number" min={0} step="any" value={bulkBase} onChange={(event) => setBulkBase(event.target.value)} placeholder="원" disabled={busy} /></Field><Field label="칸수별 증가 금액"><Input type="number" min={0} step="any" value={bulkStep} onChange={(event) => setBulkStep(event.target.value)} disabled={busy} /></Field></div><Button variant="secondary" type="button" onClick={applyBulk} disabled={busy || !lengths.length}>선택 칸수에 적용</Button></div></details></div>
      <div className={styles.sectionHeading}><h3>칸수별 가격표</h3><span>매입 · 판매 기준 단가</span></div>
      {lengths.length ? <div className={`${styles.tableScroll} ${styles.priceTableScroll}`}><table className={`${styles.table} ${styles.priceTable}`}><thead><tr><th>칸수</th><th>매입가 (원)</th><th>판매가 (원)</th><th><span className={styles.srOnly}>칸수 삭제</span></th></tr></thead><tbody>{lengths.map((length) => <tr key={length}><th scope="row">{length}칸</th><td><Input aria-label={`${length}칸 매입가`} type="number" required min={0} step="any" value={prices[length].purchase} onChange={(event) => changePrice(length, "purchase", event.target.value)} disabled={busy} /></td><td><Input aria-label={`${length}칸 판매가`} type="number" required min={0} step="any" value={prices[length].sale} onChange={(event) => changePrice(length, "sale", event.target.value)} disabled={busy} /></td><td><Button variant="ghost" type="button" aria-label={`${length}칸 삭제`} disabled={busy} onClick={() => setPrices((previous) => { const next = { ...previous }; delete next[length]; return next; })}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div> : <div className={styles.notice}>범위를 적용하거나 칸수를 개별 추가해주세요.</div>}
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
  const filtered = rods.filter((rod) => (!brandFilter || rod.brandId === brandFilter) && `${rod.name} ${brandName(rod.brandId)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
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
