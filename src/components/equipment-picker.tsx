"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Check, PackagePlus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useEquipmentCatalog } from "@/lib/equipment-context";
import { calculateEquipmentQuoteItem, equipmentPriceForMode, type EquipmentOptionGroup, type EquipmentProduct } from "@/lib/equipment";
import { modeLabel, type CalculationMode, type EquipmentComponentSnapshot, type EquipmentQuoteItem } from "@/lib/domain";
import { formatAppliedRate, formatMoney } from "@/lib/format";
import { Button, Field, Input, Modal } from "@/components/ui";
import styles from "./equipment-picker.module.css";

type Props = {
  mode: CalculationMode;
  initial?: EquipmentQuoteItem;
  onClose: () => void;
  onApply: (item: EquipmentQuoteItem) => void;
};
type ComponentLine = Omit<EquipmentComponentSnapshot, "quantity" | "unitPrice"> & { quantity: string; unitPrice: string };

const snapshotSource = "__snapshot";
const customCategory = "__custom";
const customGroup = "quote-custom";
const modePriceLabel = (mode: CalculationMode) => `${modeLabel(mode)} 단가`;
const optionalNumber = (value: string): number | null => value.trim() === "" ? null : Number(value);
const componentKey = (component: Pick<ComponentLine, "groupId" | "choiceId">) => JSON.stringify([component.groupId, component.choiceId]);
const componentLines = (item?: EquipmentQuoteItem): ComponentLine[] => item?.components.map(component => ({ ...component, quantity: String(component.quantity), unitPrice: String(component.unitPrice) })) ?? [];

/** Quote-local editing always starts with saved names and prices, not the live catalogue. */
export function EquipmentPicker({ mode, initial, onClose, onApply }: Props) {
  const { brands } = useApp();
  const { categories, products, loading, error: catalogError, retry } = useEquipmentCatalog();
  const brandListId = useId();
  const unitListId = useId();
  const [lineId] = useState(() => initial?.id ?? crypto.randomUUID());
  const [source, setSource] = useState(initial ? snapshotSource : "");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "manual");
  const [categoryName, setCategoryName] = useState(initial?.categoryName ?? "기타 용품");
  const [productId, setProductId] = useState<string | null>(initial?.productId ?? null);
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [specification, setSpecification] = useState(initial?.specification ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "개");
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [pricingMode, setPricingMode] = useState<"direct" | "rate">(initial?.pricingMode ?? "direct");
  const [basePrice, setBasePrice] = useState(initial?.baseUnitPrice == null ? "" : String(initial.baseUnitPrice));
  const [directPrice, setDirectPrice] = useState(initial ? String(initial.directUnitPrice) : "");
  const [rate, setRate] = useState(String((initial?.rate ?? .7) * 100));
  const [groups, setGroups] = useState<EquipmentOptionGroup[]>([]);
  const [components, setComponents] = useState<ComponentLine[]>(() => componentLines(initial));
  const [error, setError] = useState("");
  const filteredProducts = products.filter(product => {
    const brand = brands.find(value => value.id === product.brandId)?.name ?? "";
    const category = categories.find(value => value.id === product.categoryId)?.name ?? "";
    return `${product.name} ${product.specification} ${brand} ${category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const selectedProduct = products.find(product => product.id === source);
  const productOptions = selectedProduct && !filteredProducts.some(product => product.id === selectedProduct.id)
    ? [selectedProduct, ...filteredProducts]
    : filteredProducts;
  const groupById = useMemo(() => new Map(groups.map(group => [group.id, group])), [groups]);
  const catalogCategory = categories.find(category => category.id === categoryId);
  const categorySelect = catalogCategory?.name === categoryName ? catalogCategory.id : customCategory;

  function resetManual() {
    setSource(""); setProductId(null); setProductName(""); setBrandName(""); setSpecification("");
    setCategoryId("manual"); setCategoryName("기타 용품"); setUnit("개"); setQuantity("1");
    setBasePrice(""); setDirectPrice(""); setPricingMode("direct"); setRate("70");
    setGroups([]); setComponents([]); setError("");
  }
  function chooseProduct(product: EquipmentProduct) {
    const category = categories.find(value => value.id === product.categoryId);
    const price = equipmentPriceForMode(product, mode);
    setSource(product.id); setProductId(product.id); setProductName(product.name);
    setCategoryId(product.categoryId); setCategoryName(category?.name ?? "기타 용품");
    setBrandName(brands.find(value => value.id === product.brandId)?.name ?? "");
    setSpecification(product.specification); setUnit(product.unit || category?.unit || "개");
    setQuantity("1"); setBasePrice(price == null ? "" : String(price)); setDirectPrice(price == null ? "" : String(price));
    setPricingMode("direct"); setRate("70"); setGroups(structuredClone(product.optionGroups)); setComponents([]); setError("");
  }
  function changeSource(value: string) {
    if (value === snapshotSource && initial) {
      setSource(snapshotSource); setCategoryId(initial.categoryId); setCategoryName(initial.categoryName);
      setProductId(initial.productId); setProductName(initial.productName); setBrandName(initial.brandName);
      setSpecification(initial.specification); setUnit(initial.unit); setQuantity(String(initial.quantity));
      setPricingMode(initial.pricingMode); setBasePrice(initial.baseUnitPrice == null ? "" : String(initial.baseUnitPrice));
      setDirectPrice(String(initial.directUnitPrice)); setRate(String((initial.rate ?? .7) * 100));
      setGroups([]); setComponents(componentLines(initial)); setError(""); return;
    }
    if (!value) { resetManual(); return; }
    const product = products.find(candidate => candidate.id === value);
    if (product) chooseProduct(product);
  }
  function changeCategory(value: string) {
    const category = categories.find(candidate => candidate.id === value);
    if (!category) { setCategoryId("manual"); return; }
    setCategoryId(category.id); setCategoryName(category.name); setUnit(category.unit || "개");
    if (source === "") { setGroups(structuredClone(category.optionGroups)); setComponents([]); }
    setError("");
  }
  function componentQuantity(groupId: string, choiceId: string): string {
    return components.find(component => component.groupId === groupId && component.choiceId === choiceId)?.quantity ?? "0";
  }
  function selectChoice(group: EquipmentOptionGroup, choiceId: string, count: string) {
    const choice = group.choices.find(candidate => candidate.id === choiceId);
    setComponents(current => {
      const retained = current.filter(component => !(component.groupId === group.id &&
        (group.selection === "single" || component.choiceId === choiceId)));
      if (!choice || count === "0") return retained;
      const previous = current.find(component => component.groupId === group.id && component.choiceId === choiceId);
      return [...retained, previous ? { ...previous, quantity: count } : {
        groupId: group.id, groupName: group.name, choiceId: choice.id, choiceName: choice.label,
        quantity: count, unitPrice: String(equipmentPriceForMode(choice, mode) ?? 0),
      }];
    });
    setError("");
  }
  function changeComponent(key: string, change: Partial<ComponentLine>) {
    setComponents(current => current.map(component => componentKey(component) === key ? { ...component, ...change } : component));
    setError("");
  }
  function addComponent() {
    setComponents(current => [...current, { groupId: customGroup, groupName: "추가 구성", choiceId: crypto.randomUUID(), choiceName: "", quantity: "1", unitPrice: "0" }]);
  }
  function toItem(): EquipmentQuoteItem {
    const savedRate = initial?.rate != null && rate === String(initial.rate * 100) ? initial.rate : Number(rate) / 100;
    const item = calculateEquipmentQuoteItem({
      kind: "equipment", id: lineId, categoryId, categoryName: categoryName.trim(), productId,
      productName: productName.trim(), brandName: brandName.trim(), specification: specification.trim(),
      unit: unit.trim(), quantity: Number(quantity), pricingMode, baseUnitPrice: optionalNumber(basePrice),
      directUnitPrice: directPrice.trim() === "" ? (pricingMode === "rate" ? 0 : Number.NaN) : Number(directPrice),
      components: components.map(component => ({ ...component, choiceName: component.choiceName.trim(), quantity: Number(component.quantity), unitPrice: component.unitPrice.trim() === "" ? Number.NaN : Number(component.unitPrice) })),
      unitPrice: null, rate: pricingMode === "rate" ? (rate.trim() === "" ? Number.NaN : savedRate) : null, finalUnitPrice: 0,
    });
    // Metadata/quantity changes retain the originally agreed unit-price snapshot.
    const unchangedPrices = initial && initial.pricingMode === item.pricingMode && initial.baseUnitPrice === item.baseUnitPrice &&
      initial.directUnitPrice === item.directUnitPrice && initial.rate === item.rate && initial.components.length === item.components.length &&
      item.components.every(component => initial.components.some(previous => componentKey(previous) === componentKey(component) && previous.quantity === component.quantity && previous.unitPrice === component.unitPrice));
    return unchangedPrices ? { ...item, unitPrice: initial.unitPrice, finalUnitPrice: initial.finalUnitPrice } : item;
  }
  let calculated: EquipmentQuoteItem | null = null;
  try { calculated = toItem(); } catch { /* Incomplete fields are explained on submit. */ }
  const componentTotal = components.reduce((sum, component) => sum + (Number(component.unitPrice) || 0) * (Number(component.quantity) || 0), 0);
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      for (const group of groups) {
        const selected = components.filter(component => component.groupId === group.id && Number(component.quantity) > 0);
        if (group.required && !selected.length) throw new Error(`${group.name} 구성을 선택해주세요.`);
        if (group.selection === "single" && selected.length > 1) throw new Error(`${group.name}은 하나만 선택할 수 있습니다.`);
        if (group.selection !== "quantity" && selected.some(component => Number(component.quantity) !== 1)) throw new Error(`${group.name}의 선택 수량은 1이어야 합니다.`);
      }
      const item = toItem();
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("수량은 1 이상의 정수로 입력해주세요.");
      onApply(item);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "품목 정보를 확인해주세요."); }
  }
  const disabledProductNote = loading ? "등록 제품을 불러오는 중입니다. 직접 입력도 가능합니다." : products.length ? "제품을 바꾸면 수량과 선택 구성이 초기화됩니다." : "등록된 제품이 없어도 직접 입력해 견적에 담을 수 있습니다.";
  return <Modal wide title={initial ? "용품 항목 수정" : "용품 추가"} onClose={onClose} footer={<div className={styles.footer}>
    <div><span>{quantity || "0"}{unit || "개"} · {modeLabel(mode)} 견적</span><strong>{calculated ? formatMoney(calculated.finalUnitPrice * calculated.quantity) : "금액 입력 필요"}</strong></div>
    <Button form="equipment-quote" type="submit">{initial ? <Check size={16} /> : <PackagePlus size={16} />}{initial ? "변경 반영" : "견적에 담기"}</Button>
  </div>}>
    <form id="equipment-quote" className={styles.form} onSubmit={submit}>
      <div className={styles.selectors}>
        <Field label="제품 검색"><div className={styles.search}><Search size={16} /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="제품명·브랜드·분류 검색" /></div></Field>
        <Field label="등록 제품 (선택)"><select className="control" value={source} onChange={event => changeSource(event.target.value)}><option value="">직접 입력</option>{initial && <option value={snapshotSource}>저장된 견적 구성 유지</option>}{productOptions.map(product => <option key={product.id} value={product.id}>{brands.find(brand => brand.id === product.brandId)?.name ? `[${brands.find(brand => brand.id === product.brandId)?.name}] ` : ""}{product.name}{product.specification ? ` · ${product.specification}` : ""}</option>)}</select></Field>
      </div>
      <p className={styles.hint}>{source === snapshotSource ? "저장 당시의 제품명·구성·가격으로 수정합니다. 등록 제품을 새로 선택하면 현재 가격과 구성으로 바뀝니다." : disabledProductNote}</p>
      {search.trim() && products.length > 0 && !filteredProducts.length && <p className={styles.hint}>검색된 제품이 없습니다. 직접 입력해 견적에 담을 수도 있습니다.</p>}
      {catalogError && <div className={styles.notice}><span>등록 제품 정보를 불러오지 못했습니다. 직접 입력은 사용할 수 있습니다.</span><Button variant="secondary" onClick={retry}>다시 불러오기</Button></div>}
      <div className={styles.identityGrid}>
        <Field label="분류"><select className="control" value={categorySelect} onChange={event => changeCategory(event.target.value)}><option value={customCategory}>직접 입력</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        {categorySelect === customCategory && <Field label="분류명"><Input required maxLength={120} value={categoryName} onChange={event => { setCategoryName(event.target.value); setCategoryId("manual"); }} placeholder="예: 텐트, 좌대, 받침틀" /></Field>}
        <Field label="제품명"><Input required maxLength={120} value={productName} onChange={event => setProductName(event.target.value)} placeholder="제품명을 입력하세요" /></Field>
        <Field label="브랜드 (선택)"><Input list={brandListId} maxLength={120} value={brandName} onChange={event => setBrandName(event.target.value)} placeholder="직접 입력 또는 목록 선택" /><datalist id={brandListId}>{brands.map(brand => <option value={brand.name} key={brand.id} />)}</datalist></Field>
        <Field label="규격 (선택)"><Input value={specification} maxLength={500} onChange={event => setSpecification(event.target.value)} placeholder="예: 2인용, 10단, 120×160" /></Field>
        <div className={styles.quantityUnit}><Field label="수량"><Input type="number" min={1} step={1} required value={quantity} onChange={event => setQuantity(event.target.value)} /></Field><Field label="단위"><Input list={unitListId} required maxLength={20} value={unit} onChange={event => setUnit(event.target.value)} /><datalist id={unitListId}>{["개", "대", "동", "세트", "점"].map(value => <option value={value} key={value} />)}</datalist></Field></div>
      </div>
      <section className={styles.priceSection} aria-label="용품 가격 입력">
        <div className={styles.sectionHeading}><h3>가격</h3><div className={styles.priceToggle}><button type="button" aria-pressed={pricingMode === "direct"} onClick={() => setPricingMode("direct")}>금액 직접 입력</button><button type="button" aria-pressed={pricingMode === "rate"} onClick={() => setPricingMode("rate")}>적용율 계산</button></div></div>
        <div className={styles.priceGrid}>
          <Field label={pricingMode === "rate" ? "본체 기준 단가 (원)" : "본체 기준 단가 (선택)"} hint={pricingMode === "rate" ? "구성 금액을 더한 기준 단가에 적용율을 계산합니다." : "모르면 비워두세요. 실제 0원과 구분해 기록합니다."}><Input type="number" min={0} step={1} required={pricingMode === "rate"} value={basePrice} onChange={event => setBasePrice(event.target.value)} placeholder="기준 가격 미입력" /></Field>
          {pricingMode === "direct" ? <Field label={`본체 ${modePriceLabel(mode)} (원)`} hint="추가 구성 금액을 제외한 협의 단가입니다."><Input type="number" min={0} step={1} required value={directPrice} onChange={event => setDirectPrice(event.target.value)} placeholder="금액 입력" /></Field> : <Field label="적용율 (%)" hint="구성 포함 기준 단가에 적용합니다."><Input type="number" min={0} max={100} step="any" required value={rate} onChange={event => setRate(event.target.value)} /></Field>}
        </div>
      </section>
      {!!groups.length && <section className={styles.optionsSection} aria-label="제품 구성 선택"><div className={styles.sectionHeading}><h3>추가 구성 선택</h3><span>본체 1{unit || "개"}당 구성</span></div>
        <div className={styles.groups}>{groups.map(group => <div className={styles.optionGroup} key={group.id}>
          <div className={styles.groupTitle}><strong>{group.name}</strong><span>{group.required ? "필수" : "선택"} · {group.selection === "single" ? "하나 선택" : group.selection === "multiple" ? "여러 개 선택" : "수량 입력"}</span></div>
          {group.selection === "single" ? <select className="control" aria-label={`${group.name} 구성 선택`} value={components.find(component => component.groupId === group.id)?.choiceId ?? ""} onChange={event => selectChoice(group, event.target.value, "1")}><option value="">선택하지 않음</option>{group.choices.map(choice => <option value={choice.id} key={choice.id}>{choice.label} · {formatMoney(equipmentPriceForMode(choice, mode) ?? 0)}</option>)}</select> : <div className={styles.choices}>{group.choices.map(choice => group.selection === "multiple" ? <label className={styles.checkChoice} key={choice.id}><input type="checkbox" checked={Number(componentQuantity(group.id, choice.id)) > 0} onChange={event => selectChoice(group, choice.id, event.target.checked ? "1" : "0")} /><span>{choice.label}</span><small>{formatMoney(equipmentPriceForMode(choice, mode) ?? 0)}</small></label> : <div className={styles.quantityChoice} key={choice.id}><span>{choice.label}<small>{formatMoney(equipmentPriceForMode(choice, mode) ?? 0)}</small></span><Input aria-label={`${group.name} ${choice.label} 수량`} type="number" min={0} step={1} value={componentQuantity(group.id, choice.id)} onChange={event => selectChoice(group, choice.id, event.target.value)} /></div>)}</div>}
        </div>)}</div>
      </section>}
      <section className={styles.componentsSection} aria-label="담은 구성품"><div className={styles.sectionHeading}><h3>담은 구성품 <span>{components.length}개</span></h3><Button variant="secondary" onClick={addComponent}><Plus size={15} />구성 직접 추가</Button></div>
        {components.length ? <div className={styles.componentTableScroll}><table className={styles.componentTable}><thead><tr><th>구성품</th><th>수량</th><th>추가 단가 (원)</th><th>금액</th><th><span className={styles.srOnly}>삭제</span></th></tr></thead><tbody>{components.map(component => {
          const key = componentKey(component);
          const selection = groupById.get(component.groupId)?.selection;
          return <tr key={key}><td><span className={styles.componentGroup}>{component.groupName}</span><Input aria-label={`${component.choiceName || "추가 구성품"} 이름`} required maxLength={120} value={component.choiceName} onChange={event => changeComponent(key, { choiceName: event.target.value })} /></td><td><Input aria-label={`${component.choiceName || "추가 구성품"} 구성 수량`} type="number" min={1} step={1} required readOnly={selection === "single" || selection === "multiple"} value={component.quantity} onChange={event => changeComponent(key, { quantity: event.target.value })} /></td><td><Input aria-label={`${component.choiceName || "추가 구성품"} 추가 단가`} type="number" step={1} required value={component.unitPrice} onChange={event => changeComponent(key, { unitPrice: event.target.value })} /></td><td className={styles.numeric}>{formatMoney((Number(component.quantity) || 0) * (Number(component.unitPrice) || 0))}</td><td><Button variant="ghost" aria-label={`${component.choiceName || "추가 구성품"} 구성 삭제`} onClick={() => setComponents(current => current.filter(value => componentKey(value) !== key))}><Trash2 size={15} /></Button></td></tr>;
        })}</tbody></table></div> : <p className={styles.empty}>추가 구성품이 없으면 본체 가격으로 계산합니다. 필요한 구성은 직접 추가할 수 있습니다.</p>}
        <p className={styles.hint}>추가 단가를 바꿔 이번 견적만 조정할 수 있습니다. 누락품 감액은 음수로 입력하세요.</p>
      </section>
      <div className={styles.calculation} aria-label="용품 계산 내역"><div><span>{pricingMode === "direct" ? "본체 협의 단가" : "본체 기준 단가"}</span><strong>{(pricingMode === "direct" ? optionalNumber(directPrice) : optionalNumber(basePrice)) == null ? "미입력" : formatMoney(Number(pricingMode === "direct" ? directPrice : basePrice))}</strong></div><div><span>구성 금액</span><strong>{formatMoney(componentTotal)}</strong></div><div><span>최종 {modePriceLabel(mode)}</span><strong>{calculated ? formatMoney(calculated.finalUnitPrice) : "—"}</strong></div><div><span>실제 적용율</span><strong>{calculated?.unitPrice != null && calculated.unitPrice > 0 ? formatAppliedRate(calculated.finalUnitPrice / calculated.unitPrice) : "—"}</strong></div></div>
      {pricingMode === "direct" && <p className={styles.hint}>직접 입력한 금액은 천 원 단위로 바꾸지 않습니다. 최종 단가에 제품 수량을 곱해 견적에 담습니다.</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {initial && source !== snapshotSource && <Button className={styles.restore} variant="ghost" onClick={() => changeSource(snapshotSource)}><RotateCcw size={14} />저장 당시 구성으로 되돌리기</Button>}
    </form>
  </Modal>;
}
