import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Firestore } from 'firebase/firestore';
import { assertBrandAvailable, brandDocumentId, brandSearchText, findBrandByName, matchesBrand, normalizeBrandAliases, planBrandImport, validateBrandInput } from '../src/lib/brands';
import { normalizeBrand, type Brand, type FishingRod, type QuoteRecord } from '../src/lib/domain';
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
});

describe('additive confirmed brand registration', () => {
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
});
