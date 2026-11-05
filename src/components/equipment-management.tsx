"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Layers3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useEquipmentCatalog } from "@/lib/equipment-context";
import { createEquipmentPreset, mergeEquipmentOptionGroups, validateEquipmentCategory, validateEquipmentProduct, type EquipmentCategory, type EquipmentOptionGroup, type EquipmentProduct } from "@/lib/equipment";
import { formatMoney } from "@/lib/format";
import { brandKey, brandSearchText } from "@/lib/brands";
import { RodManagement } from "@/components/catalog-workspace";
import { EquipmentOptionEditor } from "@/components/equipment-option-editor";
import { Button, EmptyState, Field, Input, Modal, PageHeading } from "@/components/ui";
import styles from "./equipment-management.module.css";

function CatalogStatus() {
  const { loading, error, retry } = useEquipmentCatalog();
  if (loading) return <p className={styles.notice} role="status">용품과 구성 정보를 불러오는 중입니다.</p>;
  if (error) return <div className={styles.error} role="alert"><span>용품 정보를 불러오지 못했습니다. 작성 중인 내용은 유지됩니다.</span><Button variant="secondary" onClick={retry}>다시 불러오기</Button></div>;
  return null;
}

function DeleteDialog({ title, description, busy, error, onClose, onConfirm }: { title: string; description: string; busy: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? "삭제 중…" : "삭제"}</Button></>}><p className={styles.help}>{description}</p>{error && <p role="alert" className={styles.error}>{error}</p>}</Modal>;
}

function CategoryEditor({ category, onClose, onSaved }: { category?: EquipmentCategory; onClose: () => void; onSaved?: (category: EquipmentCategory) => void }) {
  const { repository, notify } = useApp();
  const [name, setName] = useState(category?.name ?? "");
  const [unit, setUnit] = useState(category?.unit ?? "개");
  const [groups, setGroups] = useState<EquipmentOptionGroup[]>(() => category ? structuredClone(category.optionGroups) : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function applyPreset(type: "tent" | "platform" | "stand") {
    const preset = createEquipmentPreset(type);
    setName(current => current.trim() ? current : preset.name);
    if (!category && unit === "개") setUnit(preset.unit);
    setGroups(current => mergeEquipmentOptionGroups(current, preset.optionGroups));
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!repository || busy) return;
    const value: EquipmentCategory = { id: category?.id ?? crypto.randomUUID(), name: name.trim(), unit: unit.trim(), optionGroups: groups, createdAt: category?.createdAt ?? new Date().toISOString(), updatedAt: category ? new Date().toISOString() : null };
    try { validateEquipmentCategory(value); } catch (failure) { setError(failure instanceof Error ? failure.message : "분류와 구성 정보를 확인해주세요."); return; }
    setBusy(true); setError("");
    try { await repository.saveEquipmentCategory(value); onSaved?.(structuredClone(value)); notify("용품 분류와 기본 구성을 저장했습니다.", "success"); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "분류를 저장하지 못했습니다. 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  return <Modal wide title={category ? "용품 분류 수정" : "용품 분류 추가"} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button type="submit" form="equipment-category-editor" disabled={busy}>{busy ? "저장 중…" : "분류 저장"}</Button></>}>
    <form id="equipment-category-editor" className={styles.editor} onSubmit={save}>
      <div className={styles.twoColumns}><Field label="분류명"><Input autoFocus required maxLength={120} value={name} placeholder="예: 텐트, 좌대, 받침틀" disabled={busy} onChange={event => setName(event.target.value)} /></Field><Field label="기본 수량 단위"><Input required maxLength={12} value={unit} placeholder="동, 대, 개, 세트" disabled={busy} onChange={event => setUnit(event.target.value)} /></Field></div>
      <div className={styles.presetBar}><div><strong>기본 구성 가져오기</strong><p>기존 구성·금액은 유지하고 새 항목만 더합니다. 이름과 가격은 자유롭게 바꿀 수 있습니다.</p></div><div className={styles.inlineActions}>{([['tent', '텐트'], ['platform', '좌대'], ['stand', '받침틀']] as const).map(([type, label]) => <Button variant="secondary" key={type} disabled={busy} onClick={() => applyPreset(type)}>{label}</Button>)}</div></div>
      <EquipmentOptionEditor groups={groups} onChange={setGroups} disabled={busy} />
      <p className={styles.help}>분류의 기본 구성은 제품 등록 시 가져올 수 있습니다. 이미 저장된 제품과 견적의 구성·가격은 자동으로 바뀌지 않습니다.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </Modal>;
}

function ProductEditor({ product, duplicate = false, onClose }: { product?: EquipmentProduct; duplicate?: boolean; onClose: () => void }) {
  const { repository, brands, notify } = useApp();
  const { categories } = useEquipmentCatalog();
  const firstCategory = categories[0];
  const [name, setName] = useState(product ? `${product.name}${duplicate ? " 복사본" : ""}` : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? firstCategory?.id ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [specification, setSpecification] = useState(product?.specification ?? "");
  const [unit, setUnit] = useState(product?.unit ?? firstCategory?.unit ?? "개");
  const [purchasePrice, setPurchasePrice] = useState(product?.purchasePrice == null ? "" : String(product.purchasePrice));
  const [salePrice, setSalePrice] = useState(product?.salePrice == null ? "" : String(product.salePrice));
  const [groups, setGroups] = useState<EquipmentOptionGroup[]>(() => structuredClone(product?.optionGroups ?? firstCategory?.optionGroups ?? []));
  const [groupsChanged, setGroupsChanged] = useState(false);
  const [unitChanged, setUnitChanged] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const categorySelectRef = useRef<HTMLSelectElement>(null);
  const categoryWasOpen = useRef(false);
  const [savedCategories, setSavedCategories] = useState<EquipmentCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  useEffect(() => {
    if (addingCategory) categoryWasOpen.current = true;
    else if (categoryWasOpen.current) {
      categoryWasOpen.current = false;
      categorySelectRef.current?.focus();
    }
  }, [addingCategory]);
  // A successful write can finish before the catalogue listener receives it.
  // Drop each fallback when received so later remote edits/deletes stay authoritative.
  const pendingCategories = savedCategories.filter(value => !categories.some(category => category.id === value.id));
  if (pendingCategories.length !== savedCategories.length) setSavedCategories(pendingCategories);
  const categoryOptions = [...categories, ...pendingCategories].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const category = categoryOptions.find(value => value.id === categoryId);
  function selectCategory(next: EquipmentCategory | undefined) {
    setCategoryId(next?.id ?? "");
    if (next && !product && !groupsChanged) setGroups(structuredClone(next.optionGroups));
    if (next && !product && !unitChanged) setUnit(next.unit);
    setTemplateMessage("");
  }
  function categorySaved(value: EquipmentCategory) {
    setSavedCategories(current => [...current.filter(category => category.id !== value.id), value]);
    selectCategory(value);
    setTemplateMessage(`‘${value.name}’ 분류를 만들고 선택했습니다. 제품 작성을 이어가세요.`);
  }
  function importCategory() {
    if (!category) return;
    setGroups(current => mergeEquipmentOptionGroups(current, category.optionGroups));
    setGroupsChanged(true);
    setTemplateMessage("분류에서 새 구성과 선택지를 가져왔습니다. 기존에 입력한 가격과 설정은 유지했습니다.");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!repository || busy) return;
    const purchase = purchasePrice.trim() === "" ? null : Number(purchasePrice);
    const sale = salePrice.trim() === "" ? null : Number(salePrice);
    const value: EquipmentProduct = { id: product && !duplicate ? product.id : crypto.randomUUID(), name: name.trim(), categoryId, brandId, specification: specification.trim(), unit: unit.trim(), purchasePrice: purchase, salePrice: sale, optionGroups: groups, createdAt: product && !duplicate ? product.createdAt ?? new Date().toISOString() : new Date().toISOString(), updatedAt: product && !duplicate ? new Date().toISOString() : null };
    try { validateEquipmentProduct(value); } catch (failure) { setError(failure instanceof Error ? failure.message : "제품 정보를 확인해주세요."); return; }
    setBusy(true); setError("");
    try { await repository.saveEquipmentProduct(value); notify("용품 제품과 구성을 저장했습니다.", "success"); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "제품을 저장하지 못했습니다. 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  return <><Modal wide title={duplicate ? "용품 제품 복제" : product ? "용품 제품 수정" : "용품 제품 추가"} onClose={busy ? undefined : onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>취소</Button><Button type="submit" form="equipment-product-editor" disabled={busy || !categoryId}>{busy ? "저장 중…" : "제품 저장"}</Button></>}>
    <form id="equipment-product-editor" className={styles.editor} onSubmit={save}>
      <div className={styles.threeColumns}>
        <div className={styles.categoryField}><Field label="분류"><select ref={categorySelectRef} className="control" required value={categoryId} disabled={busy} onChange={event => selectCategory(categoryOptions.find(value => value.id === event.target.value))}><option value="">분류 선택</option>{product && !categoryOptions.some(value => value.id === product.categoryId) && <option value={product.categoryId}>삭제된 분류</option>}{categoryOptions.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field><Button variant="secondary" className={styles.addCategory} disabled={busy} onClick={() => setAddingCategory(true)}><Plus size={14} />새 분류</Button></div>
        <Field label="브랜드 (선택)"><select className="control" value={brandId} disabled={busy} onChange={event => setBrandId(event.target.value)}><option value="">브랜드 미지정</option>{product?.brandId && !brands.some(brand => brand.id === product.brandId) && <option value={product.brandId}>삭제된 브랜드</option>}{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
        <Field label="수량 단위"><Input required maxLength={12} value={unit} placeholder="동, 대, 개, 세트" disabled={busy} onChange={event => { setUnit(event.target.value); setUnitChanged(true); }} /></Field>
      </div>
      {!categoryOptions.length && <p className={styles.help}>새 분류를 만들면 바로 선택됩니다. 입력 중인 제품 정보는 유지됩니다.</p>}
      <div className={styles.twoColumns}><Field label="제품명"><Input autoFocus required maxLength={120} value={name} placeholder="제품명" disabled={busy} onChange={event => setName(event.target.value)} /></Field><Field label="규격 (선택)"><Input maxLength={500} value={specification} placeholder="예: 2인용, 1000×1200, 10단" disabled={busy} onChange={event => setSpecification(event.target.value)} /></Field></div>
      <div className={styles.twoColumns}><Field label="매입 기준 단가 (원)" hint="빈칸은 기준가 없음, 0원은 실제 0원입니다."><Input type="number" min={0} step={1} value={purchasePrice} placeholder="기준가 없음" disabled={busy} onChange={event => setPurchasePrice(event.target.value)} /></Field><Field label="판매 기준 단가 (원)"><Input type="number" min={0} step={1} value={salePrice} placeholder="기준가 없음" disabled={busy} onChange={event => setSalePrice(event.target.value)} /></Field></div>
      <div className={styles.templateBar}><p>분류의 기본 구성에 새 항목이 생기면 기존 가격을 유지하며 추가할 수 있습니다.</p><Button variant="secondary" disabled={busy || !category?.optionGroups.length} onClick={importCategory}><Layers3 size={15} />분류 기본 구성 가져오기</Button></div>
      {templateMessage && <p className={styles.notice} role="status">{templateMessage}</p>}
      <EquipmentOptionEditor groups={groups} onChange={next => { setGroups(next); setGroupsChanged(true); }} disabled={busy} />
      <p className={styles.help}>선택지 금액은 본체 단가에 더하거나 차감합니다. 제품별로 구성을 추가하거나 가격을 바꿀 수 있고, 저장된 견적에는 당시 선택한 구성과 금액이 남습니다.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </Modal>{addingCategory && <CategoryEditor onClose={() => setAddingCategory(false)} onSaved={categorySaved} />}</>;
}

export function EquipmentManagement() {
  const { repository, brands, notify } = useApp();
  const { categories, products, loading, error: catalogError } = useEquipmentCatalog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editor, setEditor] = useState<{ product?: EquipmentProduct; duplicate?: boolean } | null>(null);
  const [deleting, setDeleting] = useState<EquipmentProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const brandName = (id: string) => brands.find(value => value.id === id)?.name ?? "브랜드 미지정";
  const categoryName = (id: string) => categories.find(value => value.id === id)?.name ?? "분류 미지정";
  const filtered = products.filter(product => {
    const brand = brands.find(value => value.id === product.brandId);
    return (!categoryFilter || product.categoryId === categoryFilter) && brandKey(`${product.name} ${product.specification} ${brand ? brandSearchText(brand) : ""} ${categoryName(product.categoryId)}`).includes(brandKey(search.trim()));
  });
  const available = !!repository && !loading && !catalogError;
  async function remove() {
    if (!repository || !deleting || busy) return;
    setBusy(true); setError("");
    try { await repository.deleteEquipmentProduct(deleting.id); setDeleting(null); notify("용품 제품을 삭제했습니다.", "success"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "제품을 삭제하지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="용품 제품 관리" description="제품별 기본 가격과 플라이·다리·브라켓 등 추가 구성을 관리합니다." action={<Button disabled={!available} onClick={() => setEditor({})}><Plus size={17} />용품 제품 추가</Button>} />
    <CatalogStatus />
    {!categories.length && !loading && !catalogError && <p className={styles.notice}>용품 제품 추가 화면에서 새 분류를 만들고 제품 등록을 이어갈 수 있습니다.</p>}
    <section className={styles.panel}><div className={styles.toolbar}><strong>등록 용품 <span>{filtered.length}종</span></strong><div className={styles.filters}><select className="control" aria-label="용품 분류 필터" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="">전체 분류</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className={styles.search}><Search size={16} /><Input aria-label="용품 제품 검색" type="search" placeholder="제품·브랜드·규격 검색" value={search} onChange={event => setSearch(event.target.value)} /></div></div></div>
      {filtered.length ? <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>분류 / 브랜드</th><th>제품명 / 규격</th><th>단위</th><th>매입 기준가</th><th>판매 기준가</th><th>추가 구성</th><th className={styles.actionsHeading}>관리</th></tr></thead><tbody>{filtered.map(product => <tr key={product.id}><td><span className={styles.tag}>{categoryName(product.categoryId)}</span><small>{brandName(product.brandId)}</small></td><td><button className={styles.nameButton} disabled={!available} onClick={() => setEditor({ product })}>{product.name}</button><small>{product.specification || "규격 미지정"}</small></td><td>{product.unit}</td><td className={styles.money}>{product.purchasePrice === null ? "—" : formatMoney(product.purchasePrice)}</td><td className={styles.money}>{product.salePrice === null ? "—" : formatMoney(product.salePrice)}</td><td>{product.optionGroups.length}그룹 · {product.optionGroups.reduce((total, group) => total + group.choices.length, 0)}개</td><td><div className={styles.compactActions}><Button variant="ghost" aria-label={`${product.name} 수정`} disabled={!available} onClick={() => setEditor({ product })}><Pencil size={15} /></Button><Button variant="ghost" aria-label={`${product.name} 복제`} disabled={!available} onClick={() => setEditor({ product, duplicate: true })}><Copy size={15} /></Button><Button variant="ghost" aria-label={`${product.name} 삭제`} disabled={!available} onClick={() => { setDeleting(product); setError(""); }}><Trash2 size={15} /></Button></div></td></tr>)}</tbody></table></div> : !loading && !catalogError && <EmptyState title={search || categoryFilter ? "검색 결과가 없습니다" : "등록된 용품 제품이 없습니다"} description={search || categoryFilter ? "검색어나 분류를 바꿔보세요." : "분류와 제품을 등록하면 견적에서 구성품을 선택해 빠르게 담을 수 있습니다."} />}
    </section>
    {editor && <ProductEditor product={editor.product} duplicate={editor.duplicate} onClose={() => setEditor(null)} />}
    {deleting && <DeleteDialog title="용품 제품 삭제" description={`‘${deleting.name}’ 제품을 삭제할까요? 이미 저장된 견적의 제품명·구성과 당시 가격은 유지됩니다.`} busy={busy} error={error} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}

export function EquipmentCategoryManagement() {
  const { repository, notify } = useApp();
  const { categories, products, loading, error: catalogError } = useEquipmentCatalog();
  const [editor, setEditor] = useState<EquipmentCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<EquipmentCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = !!repository && !loading && !catalogError;
  async function remove() {
    if (!repository || !deleting || busy) return;
    if (products.some(product => product.categoryId === deleting.id)) { setError("이 분류의 제품을 다른 분류로 옮긴 뒤 삭제해주세요."); return; }
    setBusy(true); setError("");
    try { await repository.deleteEquipmentCategory(deleting.id); setDeleting(null); notify("용품 분류를 삭제했습니다.", "success"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "분류를 삭제하지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="용품 분류·구성 관리" description="새 분류와 재사용할 기본 구성을 추가합니다. 텐트·좌대·받침틀 외의 장비도 등록할 수 있습니다." action={<Button disabled={!available} onClick={() => setEditor("new")}><Plus size={17} />용품 분류 추가</Button>} />
    <CatalogStatus />
    <section className={styles.panel}><div className={styles.toolbar}><strong>용품 분류 <span>{categories.length}개</span></strong><p className={styles.toolbarHelp}>기본 구성은 제품 등록·수정에서 가져와 제품별 가격으로 조정합니다.</p></div>
      {categories.length ? <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>분류명</th><th>기본 단위</th><th>등록 제품</th><th>기본 구성</th><th className={styles.actionsHeading}>관리</th></tr></thead><tbody>{categories.map(category => { const count = products.filter(product => product.categoryId === category.id).length; return <tr key={category.id}><td><button className={styles.nameButton} disabled={!available} onClick={() => setEditor(category)}>{category.name}</button></td><td>{category.unit}</td><td>{count}종</td><td>{category.optionGroups.length ? category.optionGroups.map(group => group.name).join(" · ") : "구성 없음"}</td><td><div className={styles.compactActions}><Button variant="ghost" aria-label={`${category.name} 분류 수정`} disabled={!available} onClick={() => setEditor(category)}><Pencil size={15} /></Button><Button variant="ghost" aria-label={`${category.name} 분류 삭제`} title={count ? "등록 제품의 분류를 변경한 뒤 삭제할 수 있습니다." : undefined} disabled={!available || count > 0} onClick={() => { setDeleting(category); setError(""); }}><Trash2 size={15} /></Button></div></td></tr>; })}</tbody></table></div> : !loading && !catalogError && <EmptyState title="등록된 용품 분류가 없습니다" description="분류를 추가하고 텐트·좌대·받침틀 기본 구성을 가져오거나, 새로운 구성을 직접 만들어보세요." action={<Button disabled={!available} onClick={() => setEditor("new")}><Plus size={16} />첫 용품 분류 추가</Button>} />}
    </section>
    {editor && <CategoryEditor category={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
    {deleting && <DeleteDialog title="용품 분류 삭제" description={`‘${deleting.name}’ 분류와 기본 구성을 삭제할까요? 저장된 견적의 정보는 유지됩니다.`} busy={busy} error={error} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}

export function ProductManagement() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") === "equipment" ? "equipment" : params.get("tab") === "categories" ? "categories" : "rods";
  return <><nav className={styles.tabs} aria-label="제품 관리 구분">{([['rods', '낚시대'], ['equipment', '용품'], ['categories', '분류·구성']] as const).map(([value, label]) => <button type="button" key={value} aria-current={tab === value ? "page" : undefined} className={tab === value ? styles.activeTab : ""} onClick={() => router.replace(`/products?tab=${value}`)}>{label}</button>)}</nav>{tab === "equipment" ? <EquipmentManagement /> : tab === "categories" ? <EquipmentCategoryManagement /> : <RodManagement />}</>;
}
