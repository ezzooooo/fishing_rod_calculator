import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Firestore } from 'firebase/firestore';
import { DemoRepository } from '../src/lib/demo-repository';
import { equipmentCategoryDraftAliases, equipmentCategoryDrafts } from '../src/lib/equipment-category-drafts';
import { planEquipmentCategoryImport } from '../src/lib/equipment-category-import';
import { type EquipmentCategory, type EquipmentOptionChoice, type EquipmentOptionGroup } from '../src/lib/equipment';
import { FirebaseRepository } from '../src/lib/repository';

const choice = (id: string, label = id, purchasePrice: number | null = null, salePrice: number | null = null): EquipmentOptionChoice => ({ id, label, purchasePrice, salePrice });
const group = (id: string, name = id, choices = [choice('item')]): EquipmentOptionGroup => ({ id, name, choices, selection: 'multiple', required: false });
const category = (id = 'draft-tent', name = '텐트', groups = [group('fly', '플라이', [choice('long', '롱플라이')])]): EquipmentCategory => ({ id, name, unit: '동', optionGroups: groups });

describe('safe equipment category import plan', () => {
  it('preserves production tent IDs, units, zero prices and the legacy missing choice', () => {
    const existing = { ...category('production-tent', '텐트', [group('fly', '플라이', [choice('long', '롱플라이', 0, 0), choice('half', '하프플라이', 0, 0), choice('missing', '미포함', 0, 0)])]), unit: '개', createdAt: '2026-01-01', customMetadata: { original: true } };
    const before = structuredClone(existing);
    const tentDraft = equipmentCategoryDrafts.find(value => value.id === 'draft-category-tent')!;
    const plan = planEquipmentCategoryImport([existing], [tentDraft]);
    assert.deepEqual({ created: plan.created, updated: plan.updated, unchanged: plan.unchanged, conflicts: plan.conflicts }, { created: 0, updated: 1, unchanged: 0, conflicts: 0 });
    const merged = plan.entries[0].category;
    assert.equal(merged.id, existing.id);
    assert.equal(merged.unit, '개');
    assert.equal(merged.createdAt, existing.createdAt);
    assert.deepEqual(Reflect.get(merged, 'customMetadata'), existing.customMetadata);
    assert.deepEqual(merged.optionGroups[0], existing.optionGroups[0]);
    assert.ok(merged.optionGroups.length > 1);
    assert.ok(merged.optionGroups.slice(1).every(value => value.choices.every(item => item.purchasePrice === null && item.salePrice === null)));
    assert.deepEqual(existing, before);
  });

  it('matches declared aliases and normalized names without renaming or repricing existing data', () => {
    const existing = { ...category('my-platform', ' 사용자 좌대 ', [group('custom-legs', '다리 구성', [choice('my-long', '롱다리', 1234, -500)])]), unit: '판' };
    const draft = category('draft-platform', '좌대·발판', [group('legs', '다리구성', [choice('long', '롱 다리'), choice('short', '숏다리')])]);
    const plan = planEquipmentCategoryImport([existing], [draft], { 'draft-platform': ['사용자좌대'] });
    const merged = plan.entries[0].category;
    assert.equal(plan.updated, 1);
    assert.equal(merged.name, existing.name);
    assert.equal(merged.unit, existing.unit);
    assert.equal(merged.optionGroups[0].id, 'custom-legs');
    assert.equal(merged.optionGroups[0].name, '다리 구성');
    assert.deepEqual(merged.optionGroups[0].choices[0], existing.optionGroups[0].choices[0]);
    assert.equal(merged.optionGroups[0].choices[1].id, 'short');
  });

  it('preserves edits and selection behavior when stable IDs match', () => {
    const existing = category('same-id', '직원이 바꾼 이름', [{ ...group('fly', '직원 구성명', [choice('long', '직원 선택지명', -1500, 0)]), selection: 'single', required: true }]);
    const plan = planEquipmentCategoryImport([existing], [category('same-id')]);
    assert.equal(plan.unchanged, 1);
    assert.deepEqual(plan.entries[0].category, existing);
  });

  it('is idempotent across all twenty draft templates and does not share mutable groups', () => {
    const initial = planEquipmentCategoryImport([], equipmentCategoryDrafts, equipmentCategoryDraftAliases);
    assert.equal(initial.created, 20);
    assert.equal(initial.conflicts, 0);
    const saved = initial.entries.map(value => value.category);
    const again = planEquipmentCategoryImport(saved, equipmentCategoryDrafts, equipmentCategoryDraftAliases);
    assert.equal(again.unchanged, 20);
    assert.equal(again.updated, 0);
    const original = equipmentCategoryDrafts[0].optionGroups[0].choices[0].label;
    saved[0].optionGroups[0].choices[0].label = '독립 복사본';
    assert.equal(equipmentCategoryDrafts[0].optionGroups[0].choices[0].label, original);
  });

  it('reports multiple existing category matches and overlapping input drafts as conflicts', () => {
    const ambiguous = planEquipmentCategoryImport([category('old-a'), category('old-b', ' 텐 트 ')], [category()]);
    assert.equal(ambiguous.conflicts, 1);
    assert.match(ambiguous.entries[0].reason!, /여러/);
    const duplicate = planEquipmentCategoryImport([], [category('draft-a'), category('draft-b', ' 텐트 ')]);
    assert.equal(duplicate.conflicts, 2);
    const aliasOverlap = planEquipmentCategoryImport([], [category('a', 'A'), category('b', 'B')], { a: ['공통'], b: ['공통'] });
    assert.equal(aliasOverlap.conflicts, 2);
  });

  it('rejects category identity or group identity that disagrees with another name match', () => {
    const categoryCollision = planEquipmentCategoryImport([category('same-id', 'A'), category('other-id', '텐트')], [category('same-id')]);
    assert.equal(categoryCollision.conflicts, 1);
    const groupCollision = planEquipmentCategoryImport([category('existing', '텐트', [group('fly', '다른 구성'), group('custom', '플라이')])], [category()]);
    assert.equal(groupCollision.conflicts, 1);
    assert.match(groupCollision.entries[0].reason!, /구성 그룹/);
  });

  it('rejects ambiguous choices and multiple incoming groups resolving to the same target', () => {
    const existing = category('existing', '텐트', [group('fly', '플라이', [choice('long', '다른 이름'), choice('custom', '롱플라이')])]);
    assert.equal(planEquipmentCategoryImport([existing], [category()]).conflicts, 1);
    const duplicateGroups = category('draft', '텐트', [group('one', '플라이'), group('two', '플 라이')]);
    assert.equal(planEquipmentCategoryImport([], [duplicateGroups]).conflicts, 1);
    const duplicateChoices = category('draft', '텐트', [group('fly', '플라이', [choice('one', '동일'), choice('two', '동 일')])]);
    assert.equal(planEquipmentCategoryImport([], [duplicateChoices]).conflicts, 1);
  });

  it('validates request limits and document IDs before a write can be attempted', () => {
    assert.throws(() => planEquipmentCategoryImport([], [category('unsafe/path')]), /문서 주소/);
    assert.throws(() => planEquipmentCategoryImport([], [category('..')]), /문서 주소/);
    assert.throws(() => planEquipmentCategoryImport([], Array.from({ length: 101 }, (_, index) => category(`id-${index}`, `이름${index}`))), /100개/);
    assert.throws(() => planEquipmentCategoryImport(Array.from({ length: 401 }, (_, index) => category(`id-${index}`, `이름${index}`)), []), /400개/);
    assert.throws(() => planEquipmentCategoryImport([], [category()], { 'draft-tent': [''] }), /별칭/);
  });
});

describe('equipment category repository import', () => {
  it('applies imports atomically and preserves products and saved quote snapshots', async () => {
    const repository = new DemoRepository();
    const products = structuredClone(Reflect.get(repository, 'equipmentProducts'));
    const quotes = structuredClone(Reflect.get(repository, 'quotes'));
    const result = await repository.importEquipmentCategories(equipmentCategoryDrafts, equipmentCategoryDraftAliases);
    assert.deepEqual(result, { created: 17, updated: 3, unchanged: 0 });
    assert.deepEqual(Reflect.get(repository, 'equipmentProducts'), products);
    assert.deepEqual(Reflect.get(repository, 'quotes'), quotes);
    assert.deepEqual(await repository.importEquipmentCategories(equipmentCategoryDrafts, equipmentCategoryDraftAliases), { created: 0, updated: 0, unchanged: 20 });
    assert.deepEqual(Reflect.get(repository, 'equipmentProducts'), products);
    assert.deepEqual(Reflect.get(repository, 'quotes'), quotes);
  });

  it('rolls back the entire import when any entry conflicts', async () => {
    const repository = new DemoRepository();
    const before = structuredClone(Reflect.get(repository, 'equipmentCategories'));
    const drafts = [category('fresh', '새 분류'), category('a', '중복'), category('b', '중복')];
    await assert.rejects(repository.importEquipmentCategories(drafts), /연결/);
    assert.deepEqual(Reflect.get(repository, 'equipmentCategories'), before);
  });

  it('replans against current data and never overwrites a category edited after preview', async () => {
    const repository = new DemoRepository();
    const draft = category();
    const existing = Reflect.get(repository, 'equipmentCategories') as EquipmentCategory[];
    assert.equal(planEquipmentCategoryImport(existing, [draft]).unchanged, 1);
    const previous = existing.find(value => value.name === '텐트')!;
    const edited = { ...previous, unit: '직접단위', optionGroups: [{ ...previous.optionGroups[0], choices: [choice('long', '수정한 이름', 7777, 0)] }] };
    await repository.saveEquipmentCategory(edited);
    const result = await repository.importEquipmentCategories([draft]);
    assert.equal(result.unchanged, 1);
    const actual = (Reflect.get(repository, 'equipmentCategories') as EquipmentCategory[]).find(value => value.id === previous.id)!;
    assert.equal(actual.unit, '직접단위');
    assert.deepEqual(actual.optionGroups, edited.optionGroups);
  });

  it('rejects unauthorized Firebase imports before touching the SDK', async () => {
    for (const session of [{ uid: null, authorized: false }, { uid: 'disabled', authorized: false }, { uid: null, authorized: true }]) {
      const repository = new FirebaseRepository({} as Firestore, () => session);
      await assert.rejects(repository.importEquipmentCategories([category()]), /로그인한 직원/);
    }
  });
});
