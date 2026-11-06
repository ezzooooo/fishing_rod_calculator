import { cloneEquipmentOptionGroups, validateEquipmentCategory, type EquipmentCategory, type EquipmentOptionGroup } from './equipment';

export type EquipmentCategoryImportAliases = Readonly<Record<string, readonly string[]>>;
export interface EquipmentCategoryImportResult { created: number; updated: number; unchanged: number }
export interface EquipmentCategoryImportEntry {
  draftId: string;
  draftName: string;
  category: EquipmentCategory;
  action: 'create' | 'update' | 'unchanged' | 'conflict';
  reason?: string;
}
export interface EquipmentCategoryImportPlan extends EquipmentCategoryImportResult {
  entries: EquipmentCategoryImportEntry[];
  conflicts: number;
}

const key = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/gu, '');
const cloneCategory = (value: EquipmentCategory): EquipmentCategory => ({ ...value, optionGroups: cloneEquipmentOptionGroups(value.optionGroups) });

function validateDocumentId(id: string) {
  if (!id || id.includes('/') || id === '.' || id === '..' || /^__.*__$/u.test(id)) throw new Error('잘못된 분류 문서 주소입니다.');
}

function validateInputs(existing: readonly EquipmentCategory[], drafts: readonly EquipmentCategory[], aliases: EquipmentCategoryImportAliases) {
  if (!Array.isArray(existing) || existing.length > 400) throw new Error('기존 분류가 400개를 초과해 한 번에 등록할 수 없습니다.');
  if (!Array.isArray(drafts) || drafts.length > 100) throw new Error('분류 초안은 한 번에 100개까지 등록해주세요.');
  for (const category of [...existing, ...drafts]) {
    validateEquipmentCategory(category);
    validateDocumentId(category.id);
  }
  if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases) || Object.keys(aliases).length > 100) throw new Error('분류 별칭을 확인해주세요.');
  for (const [id, names] of Object.entries(aliases)) {
    validateDocumentId(id);
    if (!Array.isArray(names) || names.length > 50 || names.some(name => typeof name !== 'string' || !name.trim() || name.length > 120)) throw new Error('분류 별칭은 1~120자의 이름으로 입력해주세요.');
  }
}

function mergeGroups(existing: EquipmentOptionGroup[], drafts: EquipmentOptionGroup[]): { groups: EquipmentOptionGroup[]; changed: boolean } {
  const groups = cloneEquipmentOptionGroups(existing);
  const claimedGroups = new Set<string>();
  let changed = false;
  for (const draft of drafts) {
    const matches = groups.filter(group => group.id === draft.id || key(group.name) === key(draft.name));
    if (matches.length > 1) throw new Error(`${draft.name} 구성 그룹이 여러 기존 그룹과 겹칩니다.`);
    const group = matches[0];
    const targetId = group?.id ?? draft.id;
    if (claimedGroups.has(targetId)) throw new Error(`${draft.name} 구성 그룹을 가리키는 초안이 중복됩니다.`);
    claimedGroups.add(targetId);
    if (!group) {
      if (new Set(draft.choices.map(choice => key(choice.label))).size !== draft.choices.length) throw new Error(`${draft.name}에 같은 이름을 가리키는 선택지가 여러 개입니다.`);
      groups.push(...cloneEquipmentOptionGroups([draft]));
      changed = true;
      continue;
    }
    const claimedChoices = new Set<string>();
    for (const choice of draft.choices) {
      const choices = group.choices.filter(value => value.id === choice.id || key(value.label) === key(choice.label));
      if (choices.length > 1) throw new Error(`${draft.name}의 ${choice.label} 선택지가 여러 기존 선택지와 겹칩니다.`);
      const target = choices[0];
      const choiceId = target?.id ?? choice.id;
      if (claimedChoices.has(choiceId)) throw new Error(`${draft.name}의 ${choice.label} 선택지를 가리키는 초안이 중복됩니다.`);
      claimedChoices.add(choiceId);
      if (!target) { group.choices.push({ ...choice }); changed = true; }
    }
  }
  return { groups, changed };
}

/** Add missing template data without changing an existing catalogue decision. */
export function planEquipmentCategoryImport(
  existing: readonly EquipmentCategory[],
  drafts: readonly EquipmentCategory[],
  aliases: EquipmentCategoryImportAliases = {},
): EquipmentCategoryImportPlan {
  validateInputs(existing, drafts, aliases);
  const draftKeys = drafts.map(draft => new Set([draft.name, ...(aliases[draft.id] ?? [])].map(key)));
  const entries = drafts.map((draft, index): EquipmentCategoryImportEntry => {
    const entry: EquipmentCategoryImportEntry = { draftId: draft.id, draftName: draft.name, category: cloneCategory(draft), action: 'create' };
    const matches = existing.filter(category => category.id === draft.id || draftKeys[index].has(key(category.name)));
    if (matches.length > 1) return { ...entry, action: 'conflict', reason: '같은 분류를 가리키는 기존 항목이 여러 개입니다.' };
    const previous = matches[0];
    if (previous) entry.category = cloneCategory(previous);
    try {
      const merged = mergeGroups(previous?.optionGroups ?? [], draft.optionGroups);
      entry.category = { ...(previous ?? draft), optionGroups: merged.groups };
      validateEquipmentCategory(entry.category);
      entry.action = previous ? merged.changed ? 'update' : 'unchanged' : 'create';
    } catch (error) {
      entry.action = 'conflict';
      entry.reason = error instanceof Error ? error.message : '구성 그룹을 안전하게 연결할 수 없습니다.';
    }
    return entry;
  });
  for (let index = 0; index < entries.length; index++) {
    for (let other = index + 1; other < entries.length; other++) {
      if (entries[index].category.id === entries[other].category.id || [...draftKeys[index]].some(name => draftKeys[other].has(name))) {
        for (const entry of [entries[index], entries[other]]) {
          entry.action = 'conflict';
          entry.reason = '같은 분류를 가리키는 초안이 중복됩니다.';
        }
      }
    }
  }
  return {
    entries,
    created: entries.filter(entry => entry.action === 'create').length,
    updated: entries.filter(entry => entry.action === 'update').length,
    unchanged: entries.filter(entry => entry.action === 'unchanged').length,
    conflicts: entries.filter(entry => entry.action === 'conflict').length,
  };
}
