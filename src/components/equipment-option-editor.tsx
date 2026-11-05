"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { EquipmentOptionGroup } from "@/lib/equipment";
import { Button, Field, Input } from "@/components/ui";
import styles from "./equipment-management.module.css";

type Props = {
  groups: EquipmentOptionGroup[];
  onChange: (groups: EquipmentOptionGroup[]) => void;
  disabled?: boolean;
};

export function EquipmentOptionEditor({ groups, onChange, disabled = false }: Props) {
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  function changeGroup(id: string, change: Partial<EquipmentOptionGroup>) {
    onChange(groups.map(group => group.id === id ? { ...group, ...change } : group));
  }
  function moveGroup(index: number, direction: -1 | 1) {
    const next = [...groups];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }
  function priceKey(groupId: string, choiceId: string, mode: "purchasePrice" | "salePrice") {
    return `${groupId}:${choiceId}:${mode}`;
  }
  function changePrice(group: EquipmentOptionGroup, choiceId: string, mode: "purchasePrice" | "salePrice", value: string) {
    const key = priceKey(group.id, choiceId, mode);
    setPriceInputs(current => ({ ...current, [key]: value }));
    changeGroup(group.id, { choices: group.choices.map(choice => choice.id === choiceId ? { ...choice, [mode]: value.trim() === "" ? Number.NaN : Number(value) } : choice) });
  }
  function finishPrice(key: string, value: number) {
    if (!Number.isFinite(value)) return;
    setPriceInputs(current => { const next = { ...current }; delete next[key]; return next; });
  }
  return <section className={styles.configuration} aria-label="추가 구성 설정">
    <div className={styles.sectionHeading}><div><h3>추가 구성</h3><p>구성별 선택 방식과 추가 금액을 자유롭게 관리하세요.</p></div><Button variant="secondary" disabled={disabled} onClick={() => onChange([...groups, { id: crypto.randomUUID(), name: "", selection: "multiple", required: false, choices: [{ id: crypto.randomUUID(), label: "", purchasePrice: 0, salePrice: 0 }] }])}><Plus size={15} />구성 그룹 추가</Button></div>
    {!groups.length && <div className={styles.configurationEmpty}>롱플라이, 다리 구성, 브라켓처럼 가격이 달라지는 구성을 추가할 수 있습니다.</div>}
    {groups.map((group, index) => <details className={styles.optionGroup} key={group.id} open>
      <summary><span>{group.name.trim() || `새 구성 그룹 ${index + 1}`}<small>{group.selection === "single" ? "하나 선택" : group.selection === "quantity" ? "수량 입력" : "여러 개 선택"} · {group.choices.length}개 선택지</small></span><span className={styles.disclosureMark}>펼치기 / 접기</span></summary>
      <div className={styles.optionGroupBody}>
        <div className={styles.groupControls}>
          <Field label="구성 그룹명"><Input aria-label={`구성 그룹 ${index + 1} 이름`} placeholder="예: 플라이 구성, 다리 구성" value={group.name} maxLength={120} disabled={disabled} onChange={event => changeGroup(group.id, { name: event.target.value })} /></Field>
          <Field label="선택 방식"><select className="control" aria-label={`구성 그룹 ${index + 1} 선택 방식`} value={group.selection} disabled={disabled} onChange={event => changeGroup(group.id, { selection: event.target.value as EquipmentOptionGroup["selection"] })}><option value="single">하나 선택</option><option value="multiple">여러 개 선택</option><option value="quantity">수량 입력</option></select></Field>
          <label className={styles.checkbox}><input type="checkbox" checked={group.required} disabled={disabled} onChange={event => changeGroup(group.id, { required: event.target.checked })} />필수 선택</label>
          <div className={styles.compactActions}><Button variant="ghost" aria-label={`구성 그룹 ${index + 1} 위로`} disabled={disabled || index === 0} onClick={() => moveGroup(index, -1)}><ArrowUp size={15} /></Button><Button variant="ghost" aria-label={`구성 그룹 ${index + 1} 아래로`} disabled={disabled || index === groups.length - 1} onClick={() => moveGroup(index, 1)}><ArrowDown size={15} /></Button><Button variant="ghost" aria-label={`구성 그룹 ${index + 1} 삭제`} disabled={disabled} onClick={() => onChange(groups.filter(item => item.id !== group.id))}><Trash2 size={15} /></Button></div>
        </div>
        <div className={styles.tableScroll}><table className={styles.optionTable}><thead><tr><th>선택지</th><th>매입 증감금액 (원)</th><th>판매 증감금액 (원)</th><th><span className={styles.srOnly}>선택지 관리</span></th></tr></thead><tbody>{group.choices.map((choice, choiceIndex) => <tr key={choice.id}>
          <td><Input aria-label={`구성 그룹 ${index + 1} 선택지 ${choiceIndex + 1} 이름`} placeholder="예: 롱플라이, 긴 다리" maxLength={120} value={choice.label} disabled={disabled} onChange={event => changeGroup(group.id, { choices: group.choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item) })} /></td>
          <td><Input aria-label={`구성 그룹 ${index + 1} 선택지 ${choiceIndex + 1} 매입 추가금액`} type="number" step={1} required value={priceInputs[priceKey(group.id, choice.id, "purchasePrice")] ?? choice.purchasePrice} disabled={disabled} onChange={event => changePrice(group, choice.id, "purchasePrice", event.target.value)} onBlur={() => finishPrice(priceKey(group.id, choice.id, "purchasePrice"), choice.purchasePrice)} /></td>
          <td><Input aria-label={`구성 그룹 ${index + 1} 선택지 ${choiceIndex + 1} 판매 추가금액`} type="number" step={1} required value={priceInputs[priceKey(group.id, choice.id, "salePrice")] ?? choice.salePrice} disabled={disabled} onChange={event => changePrice(group, choice.id, "salePrice", event.target.value)} onBlur={() => finishPrice(priceKey(group.id, choice.id, "salePrice"), choice.salePrice)} /></td>
          <td><Button variant="ghost" aria-label={`구성 그룹 ${index + 1} 선택지 ${choiceIndex + 1} 삭제`} disabled={disabled} onClick={() => changeGroup(group.id, { choices: group.choices.filter(item => item.id !== choice.id) })}><Trash2 size={15} /></Button></td>
        </tr>)}</tbody></table></div>
        <div className={styles.optionFooter}><span>포함 구성은 0원, 누락품 등 차감 구성은 음수로 입력하세요.</span><Button variant="secondary" disabled={disabled} onClick={() => changeGroup(group.id, { choices: [...group.choices, { id: crypto.randomUUID(), label: "", purchasePrice: 0, salePrice: 0 }] })}><Plus size={15} />선택지 추가</Button></div>
      </div>
    </details>)}
  </section>;
}
