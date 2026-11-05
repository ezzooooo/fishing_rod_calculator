import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { brandReviewPending, confirmedBrandRecommendations, userConfirmedBrandRecommendations, userConfirmedBrandReviewItems } from '../src/lib/brand-recommendations';
import { planBrandImport } from '../src/lib/brands';

const selectedNames = [
  '호봉레져', '레져다오', '승일레저', '늘푸른레져', '일또낚', '제우스레져',
  '대륙프로피싱', '오케이', '대물낚시300일', '백조', '성우이엔씨', '하이레져',
  '비바피싱', '피시베스트', '나우피싱', '다잡', '씨마', '히든피싱', '거명',
  '삼우빅캐치', '선FC', '로구만', '릿', '센스앤텍', '유양산업', '영규산업',
  '봄팩토리', '한라낚시',
];

describe('user-confirmed brand recommendations', () => {
  it('uses the exact 28 selected names and records the user decision with its product evidence', () => {
    assert.deepEqual(userConfirmedBrandRecommendations.map(brand => brand.name), selectedNames);
    assert.deepEqual(userConfirmedBrandReviewItems.map(item => item.canonicalName), selectedNames);
    assert.equal(userConfirmedBrandReviewItems.length, 28);
    assert.deepEqual(brandReviewPending, []);
    for (const brand of userConfirmedBrandRecommendations) {
      assert.equal(brand.confirmedBy, 'user');
      assert.equal(brand.confirmedOn, '2026-11-05');
      assert.match(brand.exampleUrl ?? '', /^https:\/\/fishjoongo\.com\/posts\//);
      assert(!brand.aliases.includes(brand.name), 'The canonical name should not repeat as its own alias');
      assert(brand.aliases.every(alias => !/제조사 구분|확인 후 통일|↔| \/ /.test(alias)), 'Review labels are not brand aliases');
    }
  });

  it('keeps all observed alternatives under the corresponding chosen name', () => {
    const expectedAliases: Record<string, string[]> = {
      호봉레져: ['호봉', '호봉레저'],
      레져다오: ['레저다오'],
      승일레저: ['승일', '승일레져'],
      늘푸른레져: ['늘푸른레저'],
      일또낚: ['일또낙'],
      제우스레져: ['제우스 레져', '제우스레저'],
      대륙프로피싱: ['대륙', '대륙기업'],
      오케이: ['동진기업', 'OK', 'O.K'],
      대물낚시300일: ['300days', '대물낚시 300일'],
      백조: ['백조상사'],
      성우이엔씨: ['성우'],
      하이레져: ['하이레저'],
      비바피싱: ['비바', '비바보트'],
      피시베스트: ['피쉬베스트'],
      나우피싱: ['세븐피싱'],
      다잡: ['다잡캠핑'],
      씨마: ['씨마플러스'],
      히든피싱: ['히든'],
      거명: ['거명산업'],
      삼우빅캐치: ['삼우빅케치', '삼우 빅캐치', '삼우 빅캐치사'],
      선FC: ['SUN FC'],
      로구만: ['로구맨'],
      릿: ['릿찌', '릿지', '릿지찌', 'reet', 'Reet', 'REET'],
      센스앤텍: ['센스엔텍'],
      유양산업: ['유양', '유양조구사'],
      영규산업: ['영상산업', '영규산'],
      봄팩토리: ['봄향기'],
      한라낚시: ['소야'],
    };
    for (const [name, aliases] of Object.entries(expectedAliases)) {
      const recommendation = userConfirmedBrandRecommendations.find(brand => brand.name === name);
      assert(recommendation, `${name} must exist`);
      for (const alias of aliases) assert(recommendation.aliases.includes(alias), `${alias} must resolve to ${name}`);
    }
  });

  it('merges the previous OK and 영규산업 recommendations without duplicate names or cross-brand aliases', () => {
    assert.equal(confirmedBrandRecommendations.length, 64);
    assert.equal(new Set(confirmedBrandRecommendations.map(brand => brand.name)).size, 64);
    assert.equal(confirmedBrandRecommendations.some(brand => brand.name === 'OK'), false);
    assert.equal(confirmedBrandRecommendations.filter(brand => brand.name === '영규산업').length, 1);
    const plan = planBrandImport([], confirmedBrandRecommendations);
    assert.equal(plan.conflicts, 0);
    assert.equal(plan.created, 64);
  });
});
