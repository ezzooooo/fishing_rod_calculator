import type { Brand } from './domain';

export interface BrandInput { name: string; aliases?: readonly string[] }
export interface BrandImportPlanEntry { name: string; aliases: string[]; id?: string; mergeIds?: string[]; action: 'create' | 'update' | 'unchanged' | 'conflict'; reason?: string }
export interface BrandImportResult { created: number; updated: number; unchanged: number }
export interface BrandImportPlan extends BrandImportResult { entries: BrandImportPlanEntry[]; conflicts: number }

export const MAX_BRAND_ALIASES = 50;
export function brandKey(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/gu, '');
}

/** Tolerant when reading old documents; mutation validation remains strict. */
export function normalizeBrandAliases(name: string, value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((alias): alias is string => typeof alias === 'string').map(alias => alias.trim()).filter(alias => alias && alias !== name.trim()))].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function validateBrandInput(input: BrandInput): { name: string; aliases: string[] } {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) throw new Error('브랜드명을 1~120자로 입력해주세요.');
  if (input.aliases !== undefined && (!Array.isArray(input.aliases) || input.aliases.length > MAX_BRAND_ALIASES || input.aliases.some(alias => typeof alias !== 'string' || alias.trim().length > 120))) throw new Error('별칭은 각각 120자 이하로 최대 50개까지 입력해주세요.');
  return { name: input.name.trim(), aliases: normalizeBrandAliases(input.name, input.aliases) };
}

export function brandSearchText(brand?: Pick<Brand, 'name' | 'aliases'>): string {
  return brand ? [brand.name, ...(brand.aliases ?? [])].join(' ').toLocaleLowerCase('ko') : '';
}

/** Publish the confirmed saved value before the realtime listener catches up. */
export function upsertSavedBrand(brands: readonly Brand[], saved: Brand): Brand[] {
  const value = { ...saved, aliases: [...(saved.aliases ?? [])], ...(saved.mergedBrandIds ? { mergedBrandIds: [...saved.mergedBrandIds] } : {}) };
  return [...brands.filter(brand => brand.id !== value.id), value].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function findBrandByName(brands: readonly Brand[], name: string): Brand | undefined {
  const key = brandKey(name);
  if (!key) return undefined;
  const matches = activeBrands(brands).filter(brand => [brand.name, ...(brand.aliases ?? [])].some(value => brandKey(value) === key));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Resolve retained duplicate IDs without changing product or quote documents. */
export function resolveBrandId(brands: readonly Brand[], id: string): string {
  const byId = new Map(brands.map(brand => [brand.id, brand]));
  const seen = new Set<string>();
  let current = id;
  while (true) {
    if (seen.has(current)) throw new Error('브랜드 연결이 서로 순환합니다. 브랜드 데이터를 확인해주세요.');
    seen.add(current);
    const brand = byId.get(current);
    if (!brand) {
      const targets = brands.filter(value => value.mergedBrandIds?.includes(current));
      if (targets.length > 1) throw new Error('여러 대표 브랜드에 중복 연결된 브랜드가 있습니다. 브랜드 데이터를 확인해주세요.');
      if (!targets.length) {
        if (current !== id) throw new Error('연결된 대표 브랜드를 찾을 수 없습니다. 브랜드 데이터를 확인해주세요.');
        return id;
      }
      current = targets[0].id;
      continue;
    }
    if (!brand.mergedInto) return current;
    current = brand.mergedInto;
  }
}

/** Broken redirects surface a catalogue error instead of silently hiding records. */
export function activeBrands(brands: readonly Brand[]): Brand[] {
  return brands.filter(brand => resolveBrandId(brands, brand.id) === brand.id);
}

export function mergedBrandIdsFor(brands: readonly Brand[], targetId: string, mergeIds: readonly string[]): string[] {
  const previous = brands.find(brand => brand.id === targetId);
  return [...new Set([...(previous?.mergedBrandIds ?? []), ...mergeIds.flatMap(id => [id, ...(brands.find(brand => brand.id === id)?.mergedBrandIds ?? [])])])].filter(id => id !== targetId).sort();
}

export function assertBrandDeletable(brands: readonly Brand[], id: string): void {
  const target = brands.find(brand => brand.id === id);
  if (target?.mergedInto || target?.mergedBrandIds?.length || brands.some(brand => brand.id !== id && !!brand.mergedInto && resolveBrandId(brands, brand.id) === id)) {
    throw new Error('이전 브랜드가 연결되어 있어 삭제할 수 없습니다. 브랜드 연결을 먼저 확인해주세요.');
  }
}

export function matchesBrand(brand: Pick<Brand, 'name' | 'aliases'>, query: string): boolean {
  const key = brandKey(query.trim());
  return !key || [brand.name, ...(brand.aliases ?? [])].some(value => brandKey(value).includes(key));
}

function keys(brand: BrandInput): Set<string> {
  return new Set([brand.name, ...(brand.aliases ?? [])].map(brandKey));
}

export function brandDocumentId(name: string): string {
  return `brand-${encodeURIComponent(brandKey(name))}`;
}

function overlaps(a: Set<string>, b: Set<string>): boolean { return [...a].some(key => b.has(key)); }

/** Plans additive changes only: existing IDs, unrelated documents, and product links survive. */
export function planBrandImport(existing: readonly Brand[], inputs: readonly BrandInput[]): BrandImportPlan {
  if (!Array.isArray(inputs) || inputs.length > 400) throw new Error('브랜드는 한 번에 최대 400개까지 등록할 수 있습니다.');
  const active = activeBrands(existing);
  const entries: BrandImportPlanEntry[] = inputs.map(input => {
    const value = validateBrandInput(input);
    const inputKeys = keys(value);
    const matches = active.filter(brand => overlaps(inputKeys, keys(brand))).sort((a, b) => a.id.localeCompare(b.id));
    const identicalNames = matches.length > 1 && matches.every(brand => brandKey(brand.name) === brandKey(value.name));
    if (matches.length > 1 && !identicalNames) return { ...value, action: 'conflict', reason: `기존 브랜드 ${matches.map(brand => brand.name).join(', ')}와 겹칩니다. 직접 확인해주세요.` };
    const previous = matches[0];
    if (!previous) return { ...value, action: 'create' };
    const aliases = normalizeBrandAliases(value.name, [...matches.flatMap(brand => [...(brand.aliases ?? []), brand.name]), ...value.aliases]);
    if (aliases.length > MAX_BRAND_ALIASES) return { ...value, id: previous.id, action: 'conflict', reason: '기존 별칭과 합치면 별칭 50개 제한을 초과합니다.' };
    const oldAliases = normalizeBrandAliases(previous.name, previous.aliases);
    const unchanged = matches.length === 1 && previous.name === value.name && JSON.stringify(aliases) === JSON.stringify(oldAliases);
    return { ...value, aliases, id: previous.id, action: unchanged ? 'unchanged' : 'update', ...(identicalNames ? { mergeIds: matches.slice(1).map(brand => brand.id), reason: `같은 대표명으로 중복된 브랜드 ${matches.length}개를 연결합니다.` } : {}) };
  });
  const conflict = (entry: BrandImportPlanEntry, reason: string) => { entry.action = 'conflict'; entry.reason = reason; };
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const entryKeys = keys(entry);
    for (const other of active) {
      if (other.id !== entry.id && !entry.mergeIds?.includes(other.id) && overlaps(entryKeys, keys(other))) conflict(entry, `‘${other.name}’ 브랜드의 이름 또는 별칭과 겹칩니다.`);
    }
    for (const other of entries.slice(index + 1)) {
      if ((entry.id && entry.id === other.id) || overlaps(entryKeys, keys(other))) {
        conflict(entry, `등록 목록의 ‘${other.name}’ 항목과 겹칩니다.`);
        conflict(other, `등록 목록의 ‘${entry.name}’ 항목과 겹칩니다.`);
      }
    }
  }
  return { entries, created: entries.filter(entry => entry.action === 'create').length, updated: entries.filter(entry => entry.action === 'update').length, unchanged: entries.filter(entry => entry.action === 'unchanged').length, conflicts: entries.filter(entry => entry.action === 'conflict').length };
}

export function assertBrandAvailable(existing: readonly Brand[], value: BrandInput, excludedId?: string): void {
  const normalized = validateBrandInput(value);
  const duplicates = activeBrands(existing).filter(brand => brand.id !== excludedId && overlaps(keys(normalized), keys(brand)));
  if (duplicates.length) throw new Error(`‘${duplicates.map(brand => brand.name).join(', ')}’ 브랜드의 이름 또는 별칭과 겹칩니다.`);
}
