import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";

/** The builder and historical quote additions must share the same input workflow. */
export async function quoteDetailAddBrowserFlow(page: Page): Promise<void> {
  const origin = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const table = () => page.getByRole("table", { name: "견적 항목", exact: true });
  const total = () => page.locator("main aside > strong");
  const itemRows = () => table().locator('tbody tr:has(th[scope="row"])');
  const resultPanel = () => page.getByTestId("purchase-outcome-panel");
  const sampleLink = () => page.locator("main").getByRole("link").filter({ hasText: "김민수 매입 견적" });
  const normalizedRows = async () => (await itemRows().allTextContents()).map(text => text.replace(/\s+/g, " ").trim()).sort();

  async function navigate(name: "새 견적 만들기" | "견적 내역") {
    const menu = page.getByLabel("메뉴 열기", { exact: true });
    if (await menu.isVisible() && !await menu.evaluate(element => element.closest("details")?.open)) await menu.click();
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await page.getByRole("heading", { name, level: 1, exact: true }).waitFor();
  }
  async function openRod(id: "rod-1" | "rod-2") {
    await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "낚시대 담기", exact: true });
    await picker.getByLabel("낚시대 선택", { exact: true }).selectOption(id);
    return picker;
  }
  async function applyPicker(picker: Locator) {
    await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
    await picker.waitFor({ state: "hidden" });
  }
  async function addTent(checkBackdrop = false) {
    await page.getByRole("button", { name: "용품 추가", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
    await picker.getByPlaceholder("제품명·브랜드·분류 검색").fill("텐트");
    await picker.getByLabel("등록 제품 (선택)", { exact: true }).selectOption("equipment-product-1");
    await picker.getByLabel("수량", { exact: true }).fill("2");
    await picker.getByRole("checkbox", { name: /롱플라이/ }).check();
    if (checkBackdrop) {
      await page.mouse.click(2, 2);
      assert.equal(await picker.isVisible(), true, "An accidental backdrop click must retain equipment inputs");
      assert.equal(await picker.getByLabel("수량", { exact: true }).inputValue(), "2");
      assert.equal(await picker.getByRole("checkbox", { name: /롱플라이/ }).isChecked(), true);
    }
    await applyPicker(picker);
  }
  async function saveChanges() {
    await page.getByRole("button", { name: "수정 내용 저장", exact: true }).click();
    await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  }
  async function checkLayout(label: string, saveName: string) {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(dimensions.content <= dimensions.viewport + 1, `${label} must fit ${viewport.width}px without page overflow`);
      const save = await page.getByRole("button", { name: saveName, exact: true }).boundingBox();
      assert.ok(save && save.y >= 0 && save.y + save.height <= viewport.height && save.x >= 0 && save.x + save.width <= viewport.width + 1, `${label} save must stay visible at ${viewport.width}px`);
    }
    await page.setViewportSize({ width: 1366, height: 768 });
  }

  await page.goto(origin);
  await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).waitFor();
  await page.getByLabel("고객명 (선택)", { exact: true }).fill("상세 추가 비교 고객");
  let picker = await openRod("rod-1");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("3");
  await applyPicker(picker);
  picker = await openRod("rod-2");
  await picker.getByLabel("적용율 일괄", { exact: true }).selectOption("0.65");
  await picker.getByLabel("28칸 수량", { exact: true }).fill("1");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("2");
  await applyPicker(picker);
  await addTent();
  assert.equal(await page.getByTestId("quote-total").innerText(), "617,000원");
  await page.getByRole("button", { name: "견적 저장", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "견적 저장", exact: true });
  await saveDialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.waitForURL(/\/quotes\/detail\/?\?id=/);
  await table().waitFor();
  const builderRows = await normalizedRows();
  assert.equal(builderRows.length, 4);

  await navigate("견적 내역");
  await sampleLink().click();
  await table().waitFor();
  const originalRows = await normalizedRows();
  assert.equal(await total().innerText(), "210,000원");
  await resultPanel().getByRole("button", { name: "매입 결과 기록", exact: true }).click();
  const resultDialog = page.getByRole("dialog", { name: "매입 결과 기록", exact: true });
  await resultDialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("partial");
  await resultDialog.getByTestId("purchase-quantity-0").fill("1");
  await resultDialog.getByLabel("매입일", { exact: true }).fill("2026-11-12");
  await resultDialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("60000");
  await resultDialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
  await resultDialog.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  picker = await openRod("rod-2");
  await picker.getByLabel("28칸 수량", { exact: true }).fill("9");
  await page.mouse.click(2, 2);
  assert.equal(await picker.isVisible(), true, "An accidental backdrop click must retain rod inputs");
  assert.equal(await picker.getByLabel("28칸 수량", { exact: true }).inputValue(), "9");
  await picker.getByRole("button", { name: "닫기", exact: true }).click();
  assert.deepEqual(await normalizedRows(), originalRows, "Closing the picker must not add unfinished rod quantities");

  picker = await openRod("rod-2");
  await picker.getByPlaceholder("낚시대명 또는 브랜드명으로 검색").fill("DIF");
  assert.equal(await picker.getByLabel("낚시대 선택", { exact: true }).locator("option").count(), 2, "The same brand search must be available in historical quotes");
  await picker.getByLabel("적용율 일괄", { exact: true }).selectOption("0.65");
  await picker.getByLabel("28칸 수량", { exact: true }).fill("1");
  await picker.getByLabel("28칸 수량", { exact: true }).press("Tab");
  assert.equal(await picker.getByLabel("32칸 수량", { exact: true }).evaluate(element => element === document.activeElement), true, "Tab skips the rate control and moves to the next quantity");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  assert.equal(await picker.getByLabel("36칸 수량", { exact: true }).evaluate(element => element === document.activeElement), true, "Enter advances to the next quantity without submitting");
  assert.equal(await picker.getByLabel("32칸 적용율", { exact: true }).inputValue(), "0.65");
  await checkLayout("Historical rod picker", "견적에 담기");
  await page.screenshot({ path: "outputs/next-migration/quote-detail-add-laptop.png", fullPage: false });
  await picker.getByLabel("36칸 수량", { exact: true }).press("Control+Enter");
  await picker.waitFor({ state: "hidden" });
  assert.equal(await total().innerText(), "407,000원");
  assert.ok((await normalizedRows()).includes(originalRows[0]), "Adding a different rod preserves the saved price snapshot");
  await addTent(true);
  assert.equal(await total().innerText(), "617,000원");
  await saveChanges();
  assert.deepEqual(await normalizedRows(), builderRows, "The same builder and detail inputs must produce identical saved item snapshots");
  assert.match(await resultPanel().innerText(), /60,000원/);
  assert.match(await resultPanel().innerText(), /1대/, "Adding quote items must preserve the existing acquisition snapshot");

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  picker = await openRod("rod-1");
  assert.equal(await picker.getByLabel("32칸 수량", { exact: true }).inputValue(), "0", "Adding begins with zero quantities rather than copying the saved quote");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("1");
  await applyPicker(picker);
  const oldRodGroup = table().locator('tbody[aria-label="[송원] 독야1 항목"]');
  let oldRodRows = oldRodGroup.locator('tr:has(th[scope="row"])');
  assert.equal(await oldRodRows.count(), 1, "An identical price snapshot merges into the existing row");
  assert.match(await oldRodRows.innerText(), /4대/);
  assert.match(await oldRodRows.innerText(), /70,000원/);
  assert.equal(await total().innerText(), "687,000원");
  picker = await openRod("rod-1");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("1");
  await picker.getByLabel("32칸 적용율", { exact: true }).selectOption("0.65");
  await applyPicker(picker);
  oldRodRows = oldRodGroup.locator('tr:has(th[scope="row"])');
  assert.equal(await oldRodRows.count(), 2, "Different rates remain separate rows even for the same rod and length");
  assert.match(await oldRodRows.nth(0).innerText(), /4대[\s\S]*100,000원[\s\S]*70%[\s\S]*70,000원[\s\S]*280,000원/);
  assert.match(await oldRodRows.nth(1).innerText(), /1대[\s\S]*100,000원[\s\S]*65%[\s\S]*65,000원[\s\S]*65,000원/);
  assert.equal(await total().innerText(), "752,000원");

  await page.getByRole("button", { name: "용품 추가", exact: true }).click();
  picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
  await picker.getByLabel("분류", { exact: true }).selectOption({ label: "직접 입력" });
  await picker.getByLabel("분류명", { exact: true }).fill("낚시용품");
  await picker.getByLabel("제품명", { exact: true }).fill("직접 입력 받침대");
  await picker.getByLabel("수량", { exact: true }).fill("2");
  await picker.getByLabel("단위", { exact: true }).fill("대");
  await picker.getByLabel("본체 매입 단가 (원)", { exact: true }).fill("12345");
  await applyPicker(picker);
  assert.equal(await total().innerText(), "776,690원", "Direct equipment prices stay exact and multiply quantity only once");
  await checkLayout("Historical quote editing", "수정 내용 저장");
  await saveChanges();
  const savedRows = await normalizedRows();
  assert.equal(savedRows.length, 6);
  assert.match(await table().innerText(), /12,345원[\s\S]*24,690원/);
  await page.getByRole("button", { name: "견적 내역", exact: true }).click();
  await sampleLink().click();
  await table().waitFor();
  assert.deepEqual(await normalizedRows(), savedRows, "Reopening history reads all saved added rows");
  assert.equal(await total().innerText(), "776,690원");
  assert.match(await resultPanel().innerText(), /60,000원/);

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  await oldRodGroup.getByRole("button", { name: "독야1 32칸 항목 수정", exact: true }).first().click();
  const manualEditor = page.getByRole("dialog", { name: "견적 항목 수정", exact: true });
  assert.equal(await manualEditor.getByLabel("수량", { exact: true }).inputValue(), "4", "Existing-row manual editing remains available");
  await manualEditor.getByRole("button", { name: "취소", exact: true }).click();
  picker = await openRod("rod-2");
  await picker.getByLabel("36칸 수량", { exact: true }).fill("3");
  await applyPicker(picker);
  await page.getByRole("button", { name: "수정 취소", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "변경사항을 버릴까요?", exact: true });
  await discard.getByRole("button", { name: "변경사항 버리기", exact: true }).click();
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.deepEqual(await normalizedRows(), savedRows, "Discarding the whole edit restores the saved quote after picker additions");
  assert.equal(await total().innerText(), "776,690원");
}
