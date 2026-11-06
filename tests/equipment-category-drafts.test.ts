import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { equipmentCategoryDraftAliases, equipmentCategoryDraftNotes, equipmentCategoryDraftSources, equipmentCategoryDrafts } from '../src/lib/equipment-category-drafts';
import { mergeEquipmentOptionGroups, normalizeEquipmentCategory, validateEquipmentCategory } from '../src/lib/equipment';

const selectedNames = ['텐트', '좌대·발판', '받침틀', '파라솔', '의자', '매트·방수포', '낚시가방·케이스', '난방용품', '수초제거기', '뜰채', '살림망', '릴', '찌·케미', '받침대', '낚시대', '보트', '전원·전자용품', '태클박스·아이스박스', '캠핑용품', '낚시소품·공구'];
const draft = (name: string) => equipmentCategoryDrafts.find(category => category.name === name)!;

describe('reviewed equipment category drafts', () => {
  it('contains the 20 agreed categories with stable IDs, bounded optional groups and unknown prices', () => {
    assert.deepEqual(equipmentCategoryDrafts.map(category => category.name), selectedNames);
    assert.equal(new Set(equipmentCategoryDrafts.map(category => category.id)).size, 20);
    for (const category of equipmentCategoryDrafts) {
      assert.match(category.id, /^draft-category-[a-z-]+$/);
      validateEquipmentCategory(category);
      assert(category.optionGroups.length > 0 && category.optionGroups.length <= 5);
      assert.equal(new Set(category.optionGroups.map(group => group.id)).size, category.optionGroups.length);
      for (const group of category.optionGroups) {
        assert.equal(group.required, false);
        assert(group.choices.length <= 6);
        for (const choice of group.choices) {
          assert.equal(choice.purchasePrice, null, 'Unconfirmed adjustments must not become free components');
          assert.equal(choice.salePrice, null);
        }
      }
      assert(Array.isArray(equipmentCategoryDraftAliases[category.id]));
      assert(equipmentCategoryDraftNotes[category.id]);
      assert(equipmentCategoryDraftSources[category.id].every(url => /^https:\/\/fishjoongo\.com\/posts\//.test(url)));
      assert.deepEqual(normalizeEquipmentCategory(category as unknown as Record<string, unknown>), { ...category, createdAt: null, updatedAt: null });
    }
  });

  it('keeps simultaneous and counted components flexible instead of turning model specifications into options', () => {
    const fly = draft('텐트').optionGroups.find(group => group.id === 'fly')!;
    assert.equal(fly.selection, 'multiple');
    assert.deepEqual(fly.choices.map(choice => choice.id), ['long', 'half']);
    assert(!fly.choices.some(choice => choice.id === 'missing'));
    const legs = draft('좌대·발판').optionGroups.find(group => group.id === 'legs')!;
    assert.equal(legs.selection, 'quantity');
    for (const id of ['auto-long', 'auto-middle', 'manual-short', 'inner']) assert(legs.choices.some(choice => choice.id === id));
    const holders = draft('받침틀').optionGroups.find(group => group.id === 'holders')!;
    assert.equal(holders.selection, 'quantity');
    for (const id of ['one-section', 'two-section-zoom', 'rear-holder']) assert(holders.choices.some(choice => choice.id === id));
    assert.equal(draft('파라솔').optionGroups.find(group => group.id === 'cover')?.selection, 'quantity');
    assert.equal(draft('낚시가방·케이스').optionGroups.find(group => group.id === 'trays')?.selection, 'quantity');
    assert.equal(draft('태클박스·아이스박스').optionGroups.find(group => group.id === 'fittings')?.selection, 'quantity');
    for (const category of equipmentCategoryDrafts) {
      assert(!category.optionGroups.some(group => /칸수|기어비|번수|본체 단수|가로.*세로/.test(group.name)));
    }
  });

  it('matches existing category names and retains chosen product prices during explicit template merging', () => {
    assert(equipmentCategoryDraftAliases[draft('좌대·발판').id].includes('좌대'));
    assert(equipmentCategoryDraftAliases[draft('낚시가방·케이스').id].includes('낚시가방'));
    assert(equipmentCategoryDraftAliases[draft('릴').id].includes('릴/전동릴'));
    const source = draft('텐트').optionGroups;
    const existing = [{ ...source[0], name: '매장 플라이 구성', choices: [{ ...source[0].choices[0], purchasePrice: 12000, salePrice: 0 }] }];
    const merged = mergeEquipmentOptionGroups(existing, source);
    assert.equal(merged[0].name, '매장 플라이 구성');
    assert.equal(merged[0].choices[0].purchasePrice, 12000);
    assert.equal(merged[0].choices[0].salePrice, 0);
    assert.equal(merged[0].choices.find(choice => choice.id === 'half')?.purchasePrice, null);
    merged[0].choices[0].purchasePrice = 999;
    assert.equal(existing[0].choices[0].purchasePrice, 12000);
    assert.equal(source[0].choices[0].purchasePrice, null);
  });
});
