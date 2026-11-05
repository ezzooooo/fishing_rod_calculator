import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { confirmedBrandRecommendations, userConfirmedBrandRecommendations } from '../src/lib/brand-recommendations';

/** Registration and search use only the development in-memory repository. */
export async function brandBrowserFlow(page: Page): Promise<void> {
  await page.goto('/brands/');
  await page.getByRole('button', { name: '송원 수정', exact: true }).waitFor();
  await page.locator('summary').filter({ hasText: '확인 필요 브랜드' }).click();
  assert.equal(await page.locator('details[open] tbody tr').count(), userConfirmedBrandRecommendations.length, 'Confirmed names must remain pending until saved');
  for (const width of [1280, 1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 1, `Brand review must fit ${width}px viewport`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: '검토 브랜드 등록', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: '검토 브랜드 등록 확인', exact: true });
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '동일레저 수정', exact: true }).count(), 0, 'Preview and cancellation must not write brands');
  assert.equal(await page.locator('details[open] tbody tr').count(), userConfirmedBrandRecommendations.length, 'Canceling must not clear pending names');
  await page.getByRole('button', { name: '검토 브랜드 등록', exact: true }).click();
  dialog = page.getByRole('dialog', { name: '검토 브랜드 등록 확인', exact: true });
  await dialog.getByRole('button', { name: '확인 후 등록', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  for (const brand of confirmedBrandRecommendations) {
    await page.getByRole('button', { name: `${brand.name} 수정`, exact: true }).waitFor();
  }
  await page.getByText('확인 필요 브랜드 없음', { exact: true }).waitFor();
  assert.equal(await page.locator('summary').filter({ hasText: '확인 필요 브랜드' }).count(), 0, 'Saved entries must leave the review list');
  for (const [alias, canonical] of [['승일레져', '승일레저'], ['늘푸른레저', '늘푸른레져'], ['소야', '한라낚시'], ['O.K', '오케이'], ['REET', '릿'], ['영상산업', '영규산업']]) {
    await page.getByLabel('브랜드 검색', { exact: true }).fill(alias);
    await page.getByRole('button', { name: `${canonical} 수정`, exact: true }).waitFor();
  }
  await page.getByLabel('브랜드 검색', { exact: true }).fill('동일레져');
  await page.getByRole('button', { name: '동일레저 수정', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '탑레져 수정', exact: true }).count(), 0);
  await page.getByLabel('브랜드 검색', { exact: true }).fill('dk 피 싱');
  await page.getByRole('button', { name: 'DK피싱 수정', exact: true }).waitFor();
  await page.getByLabel('브랜드 검색', { exact: true }).fill('');
  await page.getByRole('button', { name: '검토 브랜드 등록', exact: true }).click();
  dialog = page.getByRole('dialog', { name: '검토 브랜드 등록 확인', exact: true });
  assert.match(await dialog.innerText(), new RegExp(`이미 반영 ${confirmedBrandRecommendations.length}개`));
  assert.equal(await dialog.getByRole('button', { name: '확인 후 등록', exact: true }).isEnabled(), false, 'Repeated registration must be a no-op');
  await dialog.getByRole('button', { name: '취소', exact: true }).click();

  await page.getByRole('button', { name: '송원산업 수정', exact: true }).click();
  dialog = page.getByRole('dialog', { name: '브랜드 수정', exact: true });
  const aliases = dialog.getByLabel('별칭 (선택)', { exact: true });
  assert.match(await aliases.inputValue(), /송원/);
  const originalAliases = await aliases.inputValue();
  const editedBrandRow = page.getByRole('row').filter({ has: page.getByRole('button', { name: '송원산업 수정', exact: true }) });
  await aliases.fill(`${originalAliases}\n검색검증별칭\n삭제검증별칭`);
  await dialog.getByRole('button', { name: '저장', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.match(await editedBrandRow.innerText(), /검색검증별칭/, 'A successful edit must update the visible row before the delayed brand subscription');
  assert.match(await editedBrandRow.innerText(), /삭제검증별칭/, 'Every saved alias must appear immediately');

  await page.getByLabel('브랜드 검색', { exact: true }).fill('삭제검증별칭');
  await page.getByRole('button', { name: '송원산업 수정', exact: true }).click();
  dialog = page.getByRole('dialog', { name: '브랜드 수정', exact: true });
  const reopenedAliases = dialog.getByLabel('별칭 (선택)', { exact: true });
  assert.match(await reopenedAliases.inputValue(), /검색검증별칭/, 'Reopening immediately must use the saved aliases');
  assert.match(await reopenedAliases.inputValue(), /삭제검증별칭/);
  await reopenedAliases.fill(`${originalAliases}\n검색검증별칭\n수정검증별칭`);
  await dialog.getByRole('button', { name: '저장', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.getByLabel('브랜드 검색', { exact: true }).inputValue(), '송원산업', 'Removing the searched alias must switch to the canonical name so the saved row stays visible');
  const updatedRow = await editedBrandRow.innerText();
  assert.match(updatedRow, /수정검증별칭/, 'Replacing aliases must update the visible row immediately');
  assert.doesNotMatch(updatedRow, /삭제검증별칭/, 'Removed aliases must disappear immediately');
  await page.getByLabel('브랜드 검색', { exact: true }).fill('삭제검증별칭');
  assert.equal(await page.getByRole('button', { name: '송원산업 수정', exact: true }).count(), 0, 'Search must stop matching a removed alias immediately');
  await page.getByLabel('브랜드 검색', { exact: true }).fill('수정검증별칭');
  await page.getByRole('button', { name: '송원산업 수정', exact: true }).waitFor();
  await page.getByRole('button', { name: '송원산업 수정', exact: true }).click();
  dialog = page.getByRole('dialog', { name: '브랜드 수정', exact: true });
  assert.match(await dialog.getByLabel('별칭 (선택)', { exact: true }).inputValue(), /수정검증별칭/);
  assert.doesNotMatch(await dialog.getByLabel('별칭 (선택)', { exact: true }).inputValue(), /삭제검증별칭/);
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await page.getByLabel('브랜드 검색', { exact: true }).fill('');

  await page.getByRole('link', { name: '제품 관리', exact: true }).click();
  await page.getByLabel('낚시대 검색', { exact: true }).fill('검색검증별칭');
  await page.getByRole('button', { name: '독야1 수정', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '체어맨 블루 수정', exact: true }).count(), 0);
  await page.getByRole('button', { name: '용품', exact: true }).click();
  await page.getByLabel('용품 제품 검색', { exact: true }).fill('검색검증별칭');
  await page.getByRole('button', { name: '샘플 텐트 수정', exact: true }).waitFor();
  await page.getByRole('link', { name: '새 견적 만들기', exact: true }).click();
  await page.getByRole('button', { name: '낚시대 추가', exact: true }).click();
  const rodDialog = page.getByRole('dialog', { name: '낚시대 담기', exact: true });
  await rodDialog.getByLabel('낚시대 검색', { exact: true }).fill('검색검증별칭');
  assert.match(await rodDialog.getByLabel('낚시대 선택', { exact: true }).innerText(), /송원산업.*독야1/);
  assert.doesNotMatch(await rodDialog.getByLabel('낚시대 선택', { exact: true }).innerText(), /체어맨/);
  await rodDialog.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('navigation', { name: '주 메뉴', exact: true }).getByRole('link', { name: '견적 내역', exact: true }).click();
  await page.getByLabel('견적 검색', { exact: true }).fill('검색검증별칭');
  await page.getByRole('heading', { name: '김민수 매입 견적', exact: true }).waitFor();
  assert.match(await page.locator('main').innerText(), /\[송원\] 독야1/, 'Saved quote names must remain unchanged');

  await page.getByRole('link', { name: '브랜드 관리', exact: true }).click();
  await page.getByText('확인 필요 브랜드 없음', { exact: true }).waitFor();
  for (const width of [1280, 1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 1, `Brand review must fit ${width}px viewport`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByLabel('브랜드 검색', { exact: true }).fill('동일레져');
  await page.screenshot({ path: 'outputs/next-migration/brand-alias-laptop.png', fullPage: false });
}
