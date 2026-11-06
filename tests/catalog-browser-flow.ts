import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Page } from "playwright";

/** Exercises the real catalog UI against the explicitly enabled demo repository. */
export async function catalogBrowserFlow(page: Page): Promise<void> {
  const originalViewport = page.viewportSize();
  const suffix = Date.now().toString(36);
  const brandName = `검증 브랜드 ${suffix}`;
  const renamedBrand = `수정 브랜드 ${suffix}`;
  const rodName = `검증 낚시대 ${suffix}`;

  async function navigate(name: string) {
    const menu = page.getByLabel("메뉴 열기", { exact: true });
    if (await menu.isVisible()) {
      const expanded = await menu.evaluate((element) => element.closest("details")?.open);
      if (!expanded) await menu.click();
    }
    await page.getByRole("link", { name: name === "낚시대 관리" ? "제품 관리" : name, exact: true }).click();
    await page.getByRole("heading", { name, level: 1, exact: true }).waitFor();
  }

  async function noHorizontalOverflow(label: string) {
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    assert.ok(dimensions.content <= dimensions.viewport + 1, `${label}: horizontal overflow ${dimensions.content} > ${dimensions.viewport}`);
  }

  async function exportBrands(): Promise<Array<{ id: string; name: string }>> {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "브랜드 내보내기", exact: true }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^brands-\d+\.json$/);
    const path = await download.path();
    assert.ok(path, "A JSON backup file should be downloaded");
    const records: unknown = JSON.parse(await readFile(path, "utf8"));
    assert.ok(Array.isArray(records), "The backup must contain an array");
    return records;
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await navigate("브랜드 관리");
  await noHorizontalOverflow("desktop brands");
  await page.getByRole("button", { name: "브랜드 추가", exact: true }).click();
  let brandDialog = page.getByRole("dialog", { name: "브랜드 추가", exact: true });
  const brandInput = brandDialog.getByLabel("브랜드명", { exact: true });
  await brandInput.fill(brandName);
  await brandInput.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const selection = await brandInput.evaluate((element) => {
    const input = element as HTMLInputElement;
    return { start: input.selectionStart, end: input.selectionEnd, value: input.value };
  });
  assert.deepEqual(selection, { start: 0, end: brandName.length, value: brandName }, "Text inputs must select all on focus");
  await brandDialog.getByRole("button", { name: "저장", exact: true }).click();
  await brandDialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: `${brandName} 수정`, exact: true }).waitFor();

  await page.getByRole("button", { name: `${brandName} 수정`, exact: true }).click();
  brandDialog = page.getByRole("dialog", { name: "브랜드 수정", exact: true });
  await brandDialog.getByLabel("브랜드명", { exact: true }).fill(renamedBrand);
  await brandDialog.getByRole("button", { name: "저장", exact: true }).click();
  await brandDialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: `${renamedBrand} 수정`, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: `${brandName} 수정`, exact: true }).count(), 0);

  await page.setViewportSize({ width: 1280, height: 720 });
  await noHorizontalOverflow("laptop brands 1280x720");
  await page.setViewportSize({ width: 1366, height: 768 });
  await navigate("낚시대 관리");
  await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
  let rodDialog = page.getByRole("dialog", { name: "낚시대 추가", exact: true });
  await rodDialog.getByLabel("브랜드", { exact: true }).selectOption({ label: renamedBrand });
  await rodDialog.getByLabel("낚시대명", { exact: true }).fill(rodName);
  await rodDialog.getByLabel("최소 칸수", { exact: true }).fill("18");
  await rodDialog.getByLabel("최대 칸수", { exact: true }).fill("22");
  await rodDialog.getByRole("button", { name: "범위 적용", exact: true }).click();
  assert.ok(await rodDialog.getByLabel("기준 칸수", { exact: true }).isVisible(), "Automatic pricing should be discoverable when adding a rod");
  await rodDialog.getByLabel("적용 대상", { exact: true }).selectOption("both");
  await rodDialog.getByLabel("기준 칸수", { exact: true }).selectOption("20");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("15000");
  await rodDialog.getByLabel("칸수별 가격 차이", { exact: true }).fill("5000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("18칸 매입가", { exact: true }).inputValue(), "10000");
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "10000");
  assert.equal(await rodDialog.getByLabel("20칸 매입가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("22칸 매입가", { exact: true }).inputValue(), "20000");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "20000");

  await rodDialog.getByLabel("18칸 매입가", { exact: true }).press("Enter");
  assert.ok(await rodDialog.isVisible(), "Enter in a complete price table must not save or close the editor");
  assert.ok(await rodDialog.getByLabel("18칸 판매가", { exact: true }).evaluate(element => element === document.activeElement), "Purchase Enter must focus the same length's sale price");
  await page.keyboard.press("7");
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "7", "Enter navigation must select all of the next price");
  await rodDialog.getByLabel("18칸 판매가", { exact: true }).fill("10000");
  await rodDialog.getByLabel("18칸 판매가", { exact: true }).press("Enter");
  assert.ok(await rodDialog.getByLabel("20칸 매입가", { exact: true }).evaluate(element => element === document.activeElement), "Sale Enter must focus the next length's purchase price");
  await rodDialog.getByLabel("22칸 판매가", { exact: true }).press("Enter");
  assert.ok(await rodDialog.isVisible(), "Enter in the last price must still require explicit save");
  assert.ok(await rodDialog.getByRole("button", { name: "가격표 저장", exact: true }).evaluate(element => element === document.activeElement), "Last price Enter must focus Save instead of Cancel");

  await rodDialog.getByLabel("적용 대상", { exact: true }).selectOption("sale");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("1000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "0", "Prices below zero must stop at zero");
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "1000");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "6000");
  assert.equal(await rodDialog.getByLabel("18칸 매입가", { exact: true }).inputValue(), "10000", "Sale-only generation must preserve purchase prices");
  assert.equal(await rodDialog.getByLabel("20칸 매입가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("22칸 매입가", { exact: true }).inputValue(), "20000");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  await rodDialog.getByRole("alert").waitFor();
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "0", "Invalid settings must leave every generated price unchanged");
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "1000");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "6000");

  await rodDialog.getByRole("button", { name: "20칸 삭제", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("기준 칸수", { exact: true }).inputValue(), "", "Deleting the anchor must require a new explicit selection");
  assert.equal(await rodDialog.getByLabel("기준 금액", { exact: true }).inputValue(), "", "A deleted anchor must not leave its price active");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("15000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  await rodDialog.getByRole("alert").waitFor();
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "0", "Missing anchor selection must not overwrite existing prices");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "6000");
  await rodDialog.getByLabel("개별 칸수", { exact: true }).fill("30");
  await rodDialog.getByRole("button", { name: "칸수 추가", exact: true }).click();
  await rodDialog.getByLabel("적용 대상", { exact: true }).selectOption("both");
  await rodDialog.getByLabel("기준 칸수", { exact: true }).selectOption("22");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("15000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("18칸 판매가", { exact: true }).inputValue(), "10000");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("30칸 판매가", { exact: true }).inputValue(), "20000", "Irregular lengths must use selected-length order instead of numeric distance");
  await rodDialog.getByRole("button", { name: "30칸 삭제", exact: true }).click();
  await rodDialog.getByLabel("개별 칸수", { exact: true }).fill("20");
  await rodDialog.getByRole("button", { name: "칸수 추가", exact: true }).click();
  await rodDialog.getByLabel("기준 칸수", { exact: true }).selectOption("20");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("15000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  const selectedBrandId = await rodDialog.getByLabel("브랜드", { exact: true }).inputValue();
  await rodDialog.getByLabel("개별 칸수", { exact: true }).fill("31");
  await rodDialog.getByRole("button", { name: "칸수·가격 초기화", exact: true }).click();
  let resetConfirmation = rodDialog.getByRole("group", { name: "칸수·가격 초기화 확인", exact: true });
  await resetConfirmation.getByRole("button", { name: "초기화 취소", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "20000", "Canceling reset must preserve every price");
  assert.equal(await rodDialog.getByLabel("개별 칸수", { exact: true }).inputValue(), "31");
  await rodDialog.getByRole("button", { name: "칸수·가격 초기화", exact: true }).click();
  resetConfirmation = rodDialog.getByRole("group", { name: "칸수·가격 초기화 확인", exact: true });
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`rod reset confirmation ${viewport.width}`);
  }
  await resetConfirmation.getByRole("button", { name: "모두 초기화", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("낚시대명", { exact: true }).inputValue(), rodName);
  assert.equal(await rodDialog.getByLabel("브랜드", { exact: true }).inputValue(), selectedBrandId);
  for (const label of ["최소 칸수", "최대 칸수", "개별 칸수", "기준 금액", "칸수별 가격 차이"]) assert.equal(await rodDialog.getByLabel(label, { exact: true }).inputValue(), "", `Reset must clear ${label}`);
  assert.equal(await rodDialog.getByLabel("기준 칸수", { exact: true }).inputValue(), "");
  assert.equal(await rodDialog.getByLabel("18칸 매입가", { exact: true }).count(), 0);
  await rodDialog.getByLabel("최소 칸수", { exact: true }).fill("18");
  await rodDialog.getByLabel("최대 칸수", { exact: true }).fill("22");
  await rodDialog.getByRole("button", { name: "범위 적용", exact: true }).click();
  await rodDialog.getByLabel("기준 칸수", { exact: true }).selectOption("20");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("15000");
  await rodDialog.getByLabel("칸수별 가격 차이", { exact: true }).fill("5000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`stepped rod prices ${viewport.width}`);
    const saveBounds = await rodDialog.getByRole("button", { name: "가격표 저장", exact: true }).boundingBox();
    assert.ok(saveBounds && saveBounds.y >= 0 && saveBounds.y + saveBounds.height <= viewport.height, `Save must remain visible at ${viewport.width}px`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/rod-stepped-pricing-laptop.png", fullPage: false });
  await rodDialog.getByLabel("20칸 판매가", { exact: true }).fill("22000");
  await rodDialog.getByRole("button", { name: "가격표 저장", exact: true }).click();
  await rodDialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).waitFor();

  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).click();
  rodDialog = page.getByRole("dialog", { name: "낚시대 수정", exact: true });
  assert.equal(await rodDialog.getByLabel("18칸 매입가", { exact: true }).inputValue(), "10000");
  assert.equal(await rodDialog.getByLabel("20칸 매입가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("22칸 판매가", { exact: true }).inputValue(), "20000");
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "22000");
  await rodDialog.getByRole("button", { name: "칸수·가격 초기화", exact: true }).click();
  await rodDialog.getByRole("button", { name: "모두 초기화", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).count(), 0);
  await rodDialog.getByRole("button", { name: "취소", exact: true }).click();
  await rodDialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).click();
  rodDialog = page.getByRole("dialog", { name: "낚시대 수정", exact: true });
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "22000", "Reset is local until Save; canceling the editor must retain the stored table");
  await rodDialog.getByText("가격 일괄 입력", { exact: true }).click();
  await rodDialog.getByLabel("적용 대상", { exact: true }).selectOption("purchase");
  await rodDialog.getByLabel("기준 칸수", { exact: true }).selectOption("22");
  await rodDialog.getByLabel("기준 금액", { exact: true }).fill("20000");
  await rodDialog.getByLabel("칸수별 가격 차이", { exact: true }).fill("5000");
  await rodDialog.getByRole("button", { name: "선택 칸수에 적용", exact: true }).click();
  assert.equal(await rodDialog.getByLabel("18칸 매입가", { exact: true }).inputValue(), "10000");
  assert.equal(await rodDialog.getByLabel("20칸 매입가", { exact: true }).inputValue(), "15000");
  assert.equal(await rodDialog.getByLabel("22칸 매입가", { exact: true }).inputValue(), "20000");
  assert.equal(await rodDialog.getByLabel("20칸 판매가", { exact: true }).inputValue(), "22000", "Purchase-only generation in the edit dialog must preserve sale overrides");
  await rodDialog.getByLabel("20칸 판매가", { exact: true }).fill("24500");
  await rodDialog.getByRole("button", { name: "가격표 저장", exact: true }).click();
  await rodDialog.waitFor({ state: "hidden" });
  await page.getByLabel("낚시대 검색", { exact: true }).fill(rodName);
  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "독야1 수정", exact: true }).count(), 0, "Search should hide unrelated rods");
  await noHorizontalOverflow("laptop rods 1366x768");
  await page.getByLabel("낚시대 검색", { exact: true }).fill("");
  const catalogRows = page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") });
  const rowHeight = await catalogRows.first().evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(rowHeight <= 56, `Catalog rows should fit laptop screens, received ${rowHeight}px`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await noHorizontalOverflow("laptop rods 1280x720");
  const compactRowHeight = await catalogRows.first().evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(compactRowHeight <= 56, `1280px catalog row should stay compact, received ${compactRowHeight}px`);
  if (await page.getByRole("button", { name: "알림 닫기", exact: true }).count()) await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await noHorizontalOverflow("catalog screenshot 1366x768");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/catalog-laptop.png", fullPage: false });

  await navigate("시스템 설정");
  await noHorizontalOverflow("laptop settings 1366x768");
  await page.setViewportSize({ width: 1280, height: 720 });
  await noHorizontalOverflow("laptop settings 1280x720");
  const beforeImport = await exportBrands();
  assert.ok(beforeImport.some((brand) => brand.name === renamedBrand));
  await page.getByLabel("브랜드 JSON 파일", { exact: true }).setInputFiles({
    name: "invalid-brands.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([{ id: "duplicate", name: "첫 브랜드" }, { id: "duplicate", name: "두 번째 브랜드" }])),
  });
  await page.getByRole("alert").filter({ hasText: "중복" }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0, "An invalid JSON file must not open a replacement confirmation");
  assert.deepEqual(await exportBrands(), beforeImport, "Invalid imports must leave the catalog unchanged");

  await page.getByRole("button", { name: "기본 브랜드 불러오기", exact: true }).click();
  let replacementDialog = page.getByRole("dialog", { name: "브랜드 데이터 교체", exact: true });
  await replacementDialog.waitFor();
  assert.ok(await replacementDialog.getByRole("button", { name: "기존 데이터 교체", exact: true }).isEnabled());
  await replacementDialog.getByRole("button", { name: "취소", exact: true }).click();
  await replacementDialog.waitFor({ state: "hidden" });
  assert.deepEqual(await exportBrands(), beforeImport, "Canceling default data replacement must preserve existing brands");

  await page.getByLabel("브랜드 JSON 파일", { exact: true }).setInputFiles({
    name: "brands-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(beforeImport)),
  });
  replacementDialog = page.getByRole("dialog", { name: "브랜드 데이터 교체", exact: true });
  await replacementDialog.waitFor();
  await replacementDialog.getByRole("button", { name: "취소", exact: true }).click();
  await replacementDialog.waitFor({ state: "hidden" });
  assert.deepEqual(await exportBrands(), beforeImport, "Canceling JSON replacement must preserve existing brands");

  await page.setViewportSize({ width: 390, height: 844 });
  await navigate("브랜드 관리");
  await noHorizontalOverflow("mobile brands");
  await page.getByRole("button", { name: `${renamedBrand} 수정`, exact: true }).click();
  brandDialog = page.getByRole("dialog", { name: "브랜드 수정", exact: true });
  await brandDialog.waitFor();
  await noHorizontalOverflow("mobile brand editor");
  await brandDialog.getByRole("button", { name: "취소", exact: true }).click();
  await navigate("낚시대 관리");
  await noHorizontalOverflow("mobile rods");
  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).click();
  rodDialog = page.getByRole("dialog", { name: "낚시대 수정", exact: true });
  await rodDialog.waitFor();
  await noHorizontalOverflow("mobile rod editor");
  await rodDialog.getByRole("button", { name: "취소", exact: true }).click();
  await rodDialog.waitFor({ state: "hidden" });
  if (await page.getByRole("button", { name: "알림 닫기", exact: true }).count()) await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/catalog-mobile.png", fullPage: true });
  await navigate("시스템 설정");
  await noHorizontalOverflow("mobile system settings");

  await page.setViewportSize({ width: 1366, height: 768 });
  await navigate("브랜드 관리");
  await page.getByRole("button", { name: `${renamedBrand} 삭제`, exact: true }).click();
  const brandDeleteDialog = page.getByRole("dialog", { name: "브랜드 삭제", exact: true });
  await brandDeleteDialog.waitFor();
  assert.match(await brandDeleteDialog.innerText(), /함께 삭제되지 않습니다/);
  await brandDeleteDialog.getByRole("button", { name: "삭제", exact: true }).click();
  await brandDeleteDialog.waitFor({ state: "hidden" });
  assert.equal(await page.getByRole("button", { name: `${renamedBrand} 수정`, exact: true }).count(), 0);

  await navigate("낚시대 관리");
  await page.getByLabel("낚시대 검색", { exact: true }).fill(rodName);
  await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).waitFor();
  await page.getByText("삭제된 브랜드", { exact: true }).waitFor();
  await page.getByRole("button", { name: `${rodName} 삭제`, exact: true }).click();
  const rodDeleteDialog = page.getByRole("dialog", { name: "낚시대 삭제", exact: true });
  await rodDeleteDialog.getByRole("button", { name: "삭제", exact: true }).click();
  await rodDeleteDialog.waitFor({ state: "hidden" });
  assert.equal(await page.getByRole("button", { name: `${rodName} 수정`, exact: true }).count(), 0);
  await page.getByText("검색 결과가 없습니다", { exact: true }).waitFor();
  await navigate("새 견적 만들기");
  if (originalViewport) await page.setViewportSize(originalViewport);
}
