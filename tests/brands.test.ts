import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Firestore } from 'firebase/firestore';
import { activeBrands, assertBrandAvailable, brandDocumentId, brandSearchText, findBrandByName, matchesBrand, normalizeBrandAliases, planBrandImport, resolveBrandId, validateBrandInput } from '../src/lib/brands';
import { normalizeBrand, type Brand, type FishingRod, type QuoteRecord } from '../src/lib/domain';
import type { EquipmentProduct } from '../src/lib/equipment';
import { DemoRepository } from '../src/lib/demo-repository';
import { FirebaseRepository, type AppRepository } from '../src/lib/repository';

function readBrands(repository: AppRepository): Promise<Brand[]> {
  return new Promise((resolve, reject) => { const stop = repository.watchBrands(value => { stop(); resolve(value); }, reject); });
}
function readRods(repository: AppRepository): Promise<FishingRod[]> {
  return new Promise((resolve, reject) => { const stop = repository.watchRods(value => { stop(); resolve(value); }, reject); });
}
function readQuotes(repository: AppRepository): Promise<QuoteRecord[]> {
  return new Promise((resolve, reject) => { const stop = repository.watchQuotes(value => { stop(); resolve(value); }, reject); });
}
function readProducts(repository: AppRepository): Promise<EquipmentProduct[]> {
  return new Promise((resolve, reject) => { const stop = repository.watchEquipmentProducts(value => { stop(); resolve(value); }, reject); });
}

describe('brand identity and alias search', () => {
  it('reads old documents without aliases and normalizes alias input', () => {
    assert.deepEqual(normalizeBrand({ name: '동일레저' }).aliases, []);
    assert.deepEqual(normalizeBrandAliases('동일레저', [' 동일 ', '동일', '동일레저', null, 3, '']), ['동일']);
    assert.deepEqual(validateBrandInput({ name: ' 동일레저 ', aliases: [' 동일레져 ', '동일레저'] }), { name: '동일레저', aliases: ['동일레져'] });
    assert.throws(() => validateBrandInput({ name: ' ', aliases: [] }), /브랜드명/);
    assert.throws(() => validateBrandInput({ name: '동일레저', aliases: Array(51).fill('a') }), /최대 50개/);
    assert.throws(() => validateBrandInput({ name: '동일레저', aliases: ['a'.repeat(121)] }), /120자/);
  });

  it('matches aliases regardless of whitespace/case without fuzzy brand merging', () => {
    const brand = { id: '1', name: 'DK피싱', aliases: ['Dk 피싱'] };
    assert.equal(matchesBrand(brand, 'dk 피 싱'), true);
    assert.equal(matchesBrand({ name: '동일레저', aliases: ['동일레져'] }, '동일레져'), true);
    assert.equal(matchesBrand({ name: '단레져' }, '탑레져'), false);
    assert.equal(matchesBrand({ name: '태흥산업' }, '태영산업'), false);
    assert.equal(brandSearchText(undefined), '');
    assert.match(brandSearchText(brand), /dk피싱/);
    assert.equal(findBrandByName([brand], 'DK 피싱')?.id, '1');
    assert.equal(findBrandByName([brand, { id: '2', name: 'DK 피싱' }], 'dk피싱'), undefined);
    assert.equal(brandDocumentId('DK 피싱'), brandDocumentId('dk피싱'));
  });

  it('plans a canonical rename using the same ID and keeps existing names/aliases', () => {
    const existing: Brand[] = [{ id: 'legacy-id', name: '동일레져', aliases: ['동일구명칭'], createdAt: '2020-01-01' }];
    const plan = planBrandImport(existing, [{ name: '동일레저', aliases: ['동일레져', '동일'] }]);
    assert.equal(plan.updated, 1);
    assert.equal(plan.entries[0].id, 'legacy-id');
    assert.deepEqual(new Set(plan.entries[0].aliases), new Set(['동일', '동일레져', '동일구명칭']));
    assert.equal(existing[0].name, '동일레져');
    assert.equal(planBrandImport([{ id: 'legacy-id', name: '동일레저', aliases: plan.entries[0].aliases }], [{ name: '동일레저', aliases: ['동일레져', '동일'] }]).unchanged, 1);
  });

  it('holds collisions for review instead of merging two existing IDs or input groups', () => {
    const duplicates = [{ id: 'a', name: '동일' }, { id: 'b', name: '동일레져' }];
    const plan = planBrandImport(duplicates, [{ name: '동일레저', aliases: ['동일', '동일레져'] }]);
    assert.equal(plan.conflicts, 1);
    assert.equal(plan.entries[0].action, 'conflict');
    assert.equal(plan.entries[0].id, undefined);
    assert.equal(planBrandImport([], [{ name: 'A', aliases: ['공통'] }, { name: 'B', aliases: ['공통'] }]).conflicts, 2);
    assert.equal(planBrandImport([{ id: 'a', name: 'A', aliases: ['B'] }], [{ name: 'A' }, { name: 'B' }]).conflicts, 2);
    assert.throws(() => assertBrandAvailable([{ id: 'a', name: 'A', aliases: ['공통'] }], { name: 'B', aliases: ['공통'] }), /겹칩니다/);
    assert.equal(planBrandImport([], [{ name: '탑레져' }, { name: '단레져' }]).created, 2);
  });

  it('links only identical canonical names and preserves aliases from every retained duplicate', () => {
    const input = [{ name: '제우스레져', aliases: ['제우스레저'] }];
    const duplicates: Brand[] = [{ id: 'z', name: '제우스레져', aliases: ['기존검색어'] }, { id: 'a', name: '제우스레져' }];
    const plan = planBrandImport(duplicates, input);
    assert.equal(plan.conflicts, 0);
    assert.equal(plan.updated, 1);
    assert.equal(plan.entries[0].id, 'a');
    assert.deepEqual(plan.entries[0].mergeIds, ['z']);
    assert.deepEqual(new Set(plan.entries[0].aliases), new Set(['제우스레저', '기존검색어']));
    assert.deepEqual(planBrandImport([...duplicates].reverse(), input), plan, 'The selected original ID must not depend on listener order');
    assert.equal(planBrandImport([{ id: 'a', name: '제우스레져' }, { id: 'z', name: '제우스레저' }], input).conflicts, 1, 'Different canonical names still require explicit conflict review');
  });

  it('resolves redirect chains and backup link IDs while surfacing invalid connections', () => {
    const brands: Brand[] = [{ id: 'oldest', name: '이전', mergedInto: 'old' }, { id: 'old', name: '구명', mergedInto: 'current' }, { id: 'current', name: '대표', mergedBrandIds: ['backup-only'] }];
    assert.equal(resolveBrandId(brands, 'oldest'), 'current');
    assert.equal(resolveBrandId(brands, 'backup-only'), 'current');
    assert.equal(resolveBrandId(brands, 'unknown-deleted-brand'), 'unknown-deleted-brand');
    assert.deepEqual(activeBrands(brands).map(brand => brand.id), ['current']);
    assert.throws(() => resolveBrandId([{ id: 'a', name: 'A', mergedInto: 'b' }, { id: 'b', name: 'B', mergedInto: 'a' }], 'a'), /순환/);
    assert.throws(() => resolveBrandId([{ id: 'a', name: 'A', mergedInto: 'missing' }], 'a'), /대표 브랜드를 찾을 수 없습니다/);
    assert.throws(() => resolveBrandId([{ id: 'a', name: 'A', mergedBrandIds: ['shared'] }, { id: 'b', name: 'B', mergedBrandIds: ['shared'] }], 'shared'), /중복 연결/);
  });
});

describe('additive confirmed brand registration', () => {
  it('returns the normalized saved brand for creation, alias removal and canonical renaming', async () => {
    const repository = new DemoRepository();
    const created = await repository.createBrand(' 새 브랜드 ', [' 기존 표기 ', '기존 표기', '새 브랜드']);
    assert.equal(created.name, '새 브랜드');
    assert.deepEqual(created.aliases, ['기존 표기']);
    assert(created.createdAt);
    assert.equal(created.updatedAt, null);
    assert.deepEqual((await readBrands(repository)).find(brand => brand.id === created.id), created);

    const cleared = await repository.updateBrand(created.id, created.name, []);
    assert.deepEqual(cleared.aliases, [], 'An explicitly removed alias must not remain in the saved result');
    assert.equal(cleared.createdAt, created.createdAt);
    assert(cleared.updatedAt);
    const renamed = await repository.updateBrand(created.id, '새 대표명', [' 새 별칭 ', '새 별칭']);
    assert.equal(renamed.id, created.id);
    assert.deepEqual(new Set(renamed.aliases), new Set(['새 별칭', '새 브랜드']));
    assert.deepEqual((await readBrands(repository)).find(brand => brand.id === created.id), renamed);
  });

  it('returns preserved merged metadata without exposing mutable stored alias arrays', async () => {
    const repository = new DemoRepository();
    await repository.replaceBrands([{ id: 'brand-1', name: '대표명', aliases: ['이전 별칭'], mergedBrandIds: ['retained-source'], createdAt: '2020-01-01T00:00:00.000Z' }]);
    const saved = await repository.updateBrand('brand-1', '대표명', [' 새 별칭 ']);
    assert.deepEqual(saved.aliases, ['새 별칭']);
    assert.deepEqual(saved.mergedBrandIds, ['retained-source']);
    assert.equal(saved.createdAt, '2020-01-01T00:00:00.000Z');
    saved.aliases?.push('외부 변경');
    saved.mergedBrandIds?.push('외부 연결');
    const stored = (await readBrands(repository))[0];
    assert.deepEqual(stored.aliases, ['새 별칭']);
    assert.deepEqual(stored.mergedBrandIds, ['retained-source']);
  });

  it('returns successful saved data before a delayed brand subscription publishes it', async () => {
    const repository = new DemoRepository({ brandSnapshotDelayMs: 30 });
    let publishCount = 0;
    let ready!: () => void;
    let updated!: (brands: Brand[]) => void;
    const initial = new Promise<void>(resolve => { ready = resolve; });
    const nextSnapshot = new Promise<Brand[]>(resolve => { updated = resolve; });
    const stop = repository.watchBrands(brands => {
      publishCount++;
      if (publishCount === 1) ready();
      else updated(brands);
    });
    try {
      await initial;
      const saved = await repository.updateBrand('brand-1', '송원', ['바로 보일 별칭']);
      assert.equal(publishCount, 1, 'The saved response must be usable while the previous snapshot is still visible');
      assert.deepEqual(saved.aliases, ['바로 보일 별칭']);
      const snapshot = await nextSnapshot;
      assert.deepEqual(snapshot.find(brand => brand.id === saved.id), saved);
    } finally { stop(); }
  });

  it('preserves legacy IDs, metadata, product references and quote snapshots and is idempotent', async () => {
    const repository = new DemoRepository();
    const rods = await readRods(repository);
    const quotes = await readQuotes(repository);
    const initial = await readBrands(repository);
    const preserved = { ...initial[0], customMetadata: 'keep' };
    await repository.replaceBrands([preserved, ...initial.slice(1)]);
    const first = await repository.importBrands([{ name: '송원산업', aliases: ['송원', '송원 산업'] }, { name: '동일레저', aliases: ['동일', '동일레져'] }]);
    assert.deepEqual(first, { created: 1, updated: 1, unchanged: 0 });
    const after = await readBrands(repository);
    const renamed = after.find(brand => brand.name === '송원산업')!;
    assert.equal(renamed.id, preserved.id);
    assert.equal((renamed as Brand & { customMetadata: string }).customMetadata, 'keep');
    assert.equal(renamed.createdAt, preserved.createdAt);
    assert(renamed.aliases?.includes('송원'));
    assert.deepEqual(await readRods(repository), rods);
    assert.deepEqual(await readQuotes(repository), quotes);
    assert.deepEqual(await repository.importBrands([{ name: '송원산업', aliases: ['송원', '송원 산업'] }, { name: '동일레저', aliases: ['동일', '동일레져'] }]), { created: 0, updated: 0, unchanged: 2 });
    assert.deepEqual(await readBrands(repository), after);
  });

  it('rejects conflicting input atomically and protects aliases during individual edits', async () => {
    const repository = new DemoRepository();
    const before = await readBrands(repository);
    await assert.rejects(repository.importBrands([{ name: '신규', aliases: ['송원'] }, { name: '또신규', aliases: ['DIF', '송원'] }]), /겹치는 항목/);
    assert.deepEqual(await readBrands(repository), before);
    await repository.createBrand('동일레저', ['동일레져']);
    await assert.rejects(repository.createBrand('동일레져'), /겹칩니다/);
    const brand = (await readBrands(repository)).find(value => value.name === '동일레저')!;
    await repository.updateBrand(brand.id, '동일새이름');
    const updated = (await readBrands(repository)).find(value => value.id === brand.id)!;
    assert.deepEqual(new Set(updated.aliases), new Set(['동일레저', '동일레져']));
    updated.aliases?.push('외부변경');
    assert.equal((await readBrands(repository)).find(value => value.id === brand.id)?.aliases?.includes('외부변경'), false);
  });

  it('authorizes bulk imports before touching Firebase', async () => {
    const repository = new FirebaseRepository({} as Firestore, () => ({ uid: null, authorized: false }));
    await assert.rejects(repository.importBrands([{ name: '동일레저', aliases: ['동일'] }]), /로그인한 직원만/);
  });

  it('retains duplicate documents and raw product references and survives an active-brand backup restore', async () => {
    const repository = new DemoRepository();
    const quotes = await readQuotes(repository);
    const rods = await readRods(repository);
    const products = await readProducts(repository);
    const rawRods = structuredClone(Reflect.get(repository, 'rods'));
    const rawProducts = structuredClone(Reflect.get(repository, 'equipmentProducts'));
    await repository.replaceBrands([{ id: 'brand-1', name: '제우스레져', aliases: ['기존별칭'], createdAt: '2020-01-01' }, { id: 'brand-0', name: '제우스레져', createdAt: '2021-01-01' }, { id: 'brand-2', name: 'DIF' }]);
    assert.deepEqual(await repository.importBrands([{ name: '제우스레져', aliases: ['제우스레저', '제우스 레져'] }]), { created: 0, updated: 1, unchanged: 0 });
    const active = await readBrands(repository);
    assert.equal(active.length, 2);
    const canonical = active.find(brand => brand.name === '제우스레져')!;
    assert.equal(canonical.id, 'brand-0');
    assert.deepEqual(canonical.mergedBrandIds, ['brand-1']);
    assert(canonical.aliases?.includes('기존별칭'));
    const rawBrands = Reflect.get(repository, 'brands') as Brand[];
    assert.equal(rawBrands.length, 3, 'Soft linking must not delete a source document');
    assert.equal(rawBrands.find(brand => brand.id === 'brand-1')?.mergedInto, 'brand-0');
    assert.equal(rawBrands.find(brand => brand.id === 'brand-1')?.createdAt, '2020-01-01');
    assert.deepEqual(Reflect.get(repository, 'rods'), rawRods, 'Stored product brand IDs and price maps stay untouched');
    assert.deepEqual(Reflect.get(repository, 'equipmentProducts'), rawProducts);
    assert.deepEqual(await readRods(repository), rods.map(rod => ({ ...rod, brandId: rod.brandId === 'brand-1' ? 'brand-0' : rod.brandId })));
    assert.deepEqual(await readProducts(repository), products.map(product => ({ ...product, brandId: 'brand-0' })));
    assert.deepEqual(await readQuotes(repository), quotes);
    await assert.rejects(repository.deleteBrand('brand-0'), /이전 브랜드가 연결/);
    await assert.rejects(repository.deleteBrand('brand-1'), /이전 브랜드가 연결/);
    assert.deepEqual(await repository.importBrands([{ name: '제우스레져', aliases: ['제우스레저', '제우스 레져'] }]), { created: 0, updated: 0, unchanged: 1 });
    const backup = JSON.parse(JSON.stringify(active)) as Record<string, unknown>[];
    await repository.replaceBrands(backup.map(brand => normalizeBrand(brand)));
    assert.equal((await readRods(repository))[0].brandId, 'brand-0', 'Active-only backups retain old ID resolution');
    assert((await readProducts(repository)).every(product => product.brandId === 'brand-0'));
    assert.deepEqual(await readQuotes(repository), quotes);
  });
});
