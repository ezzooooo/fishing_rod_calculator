import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";

/** Edits saved rod groups without replacing their historical price snapshots. */
export async function quoteDetailGroupBrowserFlow(page: Page): Promise<void> {
  const origin = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const table = () => page.getByRole("table", { name: "견적 항목", exact: true });
  const total = () => page.locator("main aside > strong");
  const group = () => table().locator('tbody[aria-label="[송원] 독야1 항목"]');
  const groupRows = () => group().locator('tr:has(th[scope="row"])');
  const otherGroups = () => table().locator('tbody:not([aria-label="[송원] 독야1 항목"])');
  const resultPanel = () => page.getByTestId("purchase-outcome-panel");
  const sampleLink = () => page.locator("main").getByRole("link").filter({ hasText: "김민수 매입 견적" });
  const normalizedRows = async (locator: Locator = table()) => (await locator.locator('tr:has(th[scope="row"])').allTextContents()).map(text => text.replace(/\s+/g, " ").trim()).sort();

  async function navigate(name: "견적 내역" | "제품 관리") {
    const menu = page.getByLabel("메뉴 열기", { exact: true });
    if (await menu.isVisible() && !await menu.evaluate(element => element.closest("details")?.open)) await menu.click();
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await page.getByRole("heading", { name: name === "제품 관리" ? "낚시대 관리" : name, level: 1, exact: true }).waitFor();
  }
  async function saveChanges() {
    await page.getByRole("button", { name: "수정 내용 저장", exact: true }).click();
    await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  }
  async function apply(picker: Locator) {
    await picker.getByRole("button", { name: "변경 반영", exact: true }).click();
    await picker.waitFor({ state: "hidden" });
  }
  async function openGroup() {
    await group().getByRole("button", { name: "독야1 칸수별 수정", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "담은 낚시대 수정", exact: true });
    await picker.waitFor();
    return picker;
  }
  async function settleLayout() {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  async function checkLayout(picker: Locator) {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await settleLayout();
      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(dimensions.content <= dimensions.viewport + 1, `Saved group editor fits ${viewport.width}px without page overflow`);
      const save = await picker.getByRole("button", { name: "변경 반영", exact: true }).boundingBox();
      assert.ok(save && save.y >= 0 && save.y + save.height <= viewport.height && save.x >= 0 && save.x + save.width <= viewport.width + 1, `Group apply stays visible at ${viewport.width}px`);
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await settleLayout();
    const save = await picker.getByRole("button", { name: "변경 반영", exact: true }).boundingBox();
    assert.ok(save && save.x >= 0 && save.x + save.width <= 1366 && save.y >= 0 && save.y + save.height <= 768, "The settled laptop apply button remains fully in view");
  }

  await page.goto(origin);
  await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).waitFor();
  await navigate("견적 내역");
  await sampleLink().click();
  await table().waitFor();
  await resultPanel().getByRole("button", { name: "매입 결과 기록", exact: true }).click();
  const resultDialog = page.getByRole("dialog", { name: "매입 결과 기록", exact: true });
  await resultDialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("partial");
  await resultDialog.getByTestId("purchase-quantity-0").fill("1");
  await resultDialog.getByLabel("매입일", { exact: true }).fill("2026-11-12");
  await resultDialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("60000");
  await resultDialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
  await resultDialog.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
  let picker = page.getByRole("dialog", { name: "낚시대 담기", exact: true });
  await picker.getByLabel("낚시대 선택", { exact: true }).selectOption("rod-2");
  await picker.getByLabel("28칸 수량", { exact: true }).fill("1");
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
  picker = page.getByRole("dialog", { name: "낚시대 담기", exact: true });
  await picker.getByLabel("낚시대 선택", { exact: true }).selectOption("rod-1");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("1");
  await picker.getByLabel("32칸 적용율", { exact: true }).selectOption("0.65");
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "용품 추가", exact: true }).click();
  picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
  await picker.getByLabel("등록 제품 (선택)", { exact: true }).selectOption("equipment-product-1");
  await picker.getByRole("checkbox", { name: /롱플라이/ }).check();
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  assert.equal(await total().innerText(), "446,000원");
  await saveChanges();
  const initialRows = await normalizedRows();
  const otherRows = await normalizedRows(otherGroups());

  await navigate("제품 관리");
  await page.getByRole("button", { name: "독야1 수정", exact: true }).click();
  const catalogEditor = page.getByRole("dialog", { name: "낚시대 수정", exact: true });
  await catalogEditor.getByLabel("낚시대명", { exact: true }).fill("현재 독야1");
  await catalogEditor.getByLabel("32칸 매입가", { exact: true }).fill("200000");
  await catalogEditor.getByLabel("28칸 매입가", { exact: true }).fill("90000");
  await catalogEditor.getByRole("button", { name: "가격표 저장", exact: true }).click();
  await catalogEditor.waitFor({ state: "hidden" });
  await navigate("견적 내역");
  await sampleLink().click();
  await table().waitFor();
  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await settleLayout();
  const groupEntry = await group().getByRole("button", { name: "독야1 칸수별 수정", exact: true }).boundingBox();
  assert.ok(groupEntry && groupEntry.x >= 0 && groupEntry.x + groupEntry.width <= 390, "The mobile group edit button is accessible without horizontal table scrolling");
  await page.setViewportSize({ width: 1366, height: 768 });
  await settleLayout();
  picker = await openGroup();
  assert.equal(await picker.getByLabel("낚시대 선택", { exact: true }).count(), 0, "A saved group edit keeps the original rod identity fixed");
  assert.equal(await picker.getByLabel("32칸 항목 1 수량", { exact: true }).inputValue(), "3");
  assert.equal(await picker.getByLabel("32칸 항목 2 수량", { exact: true }).inputValue(), "1");
  assert.equal(await picker.getByLabel("32칸 항목 1 적용율", { exact: true }).inputValue(), "0.7");
  assert.equal(await picker.getByLabel("32칸 항목 2 적용율", { exact: true }).inputValue(), "0.65");
  await apply(picker);
  assert.deepEqual(await normalizedRows(), initialRows, "Opening and applying preserves duplicate saved rows, names and historical prices after a catalog edit");

  picker = await openGroup();
  await picker.getByLabel("28칸 수량", { exact: true }).fill("1");
  await picker.getByLabel("28칸 적용율", { exact: true }).selectOption("0.5");
  await picker.getByLabel("32칸 항목 1 수량", { exact: true }).fill("4");
  await picker.getByLabel("32칸 항목 1 수량", { exact: true }).press("Tab");
  assert.equal(await picker.getByLabel("32칸 항목 2 수량", { exact: true }).evaluate(element => element === document.activeElement), true, "Tab skips the rate and reaches the next saved quantity");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  assert.equal(await picker.getByLabel("34칸 수량", { exact: true }).evaluate(element => element === document.activeElement), true, "Enter advances to the next quantity without submitting");
  await page.mouse.click(2, 2);
  assert.equal(await picker.isVisible(), true, "Backdrop clicks retain unfinished saved-group inputs");
  await checkLayout(picker);
  await page.screenshot({ path: "outputs/next-migration/quote-detail-group-laptop.png", fullPage: false });
  await picker.getByLabel("34칸 수량", { exact: true }).press("Control+Enter");
  await picker.waitFor({ state: "hidden" });
  assert.equal(await total().innerText(), "626,000원");
  assert.equal(await groupRows().count(), 3, "A previously unquoted catalog length is added alongside both saved rows");
  assert.match(await group().innerText(), /28칸[\s\S]*90,000원[\s\S]*50%[\s\S]*45,000원/);
  assert.match(await group().innerText(), /32칸[\s\S]*4대[\s\S]*100,000원[\s\S]*70%[\s\S]*70,000원/);
  assert.deepEqual(await normalizedRows(otherGroups()), otherRows, "Other rod types and equipment remain unchanged");
  await saveChanges();

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  picker = await openGroup();
  await picker.getByLabel("적용율 일괄", { exact: true }).selectOption("0.6");
  assert.equal(await picker.getByLabel("28칸 적용율", { exact: true }).inputValue(), "0.6");
  assert.equal(await picker.getByLabel("32칸 항목 1 적용율", { exact: true }).inputValue(), "0.6");
  assert.equal(await picker.getByLabel("32칸 항목 2 적용율", { exact: true }).inputValue(), "0.6");
  await picker.getByLabel("32칸 항목 2 수량", { exact: true }).fill("0");
  await apply(picker);
  assert.equal(await total().innerText(), "465,000원", "Only changed rates reprice saved base amounts, while quantity zero removes a selected row");
  assert.equal(await groupRows().count(), 2);
  await saveChanges();
  const savedRows = await normalizedRows();
  assert.match(await resultPanel().innerText(), /60,000원/);
  assert.match(await resultPanel().innerText(), /1대/);
  await page.getByRole("button", { name: "견적 내역", exact: true }).click();
  await sampleLink().click();
  await table().waitFor();
  assert.deepEqual(await normalizedRows(), savedRows, "Saved group quantities and rates survive reopening history");
  assert.equal(await total().innerText(), "465,000원");

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  picker = await openGroup();
  for (const input of await picker.getByRole("spinbutton").all()) await input.fill("0");
  await picker.getByRole("button", { name: "변경 반영", exact: true }).click();
  await picker.getByRole("alert").waitFor();
  assert.equal(await picker.isVisible(), true, "An all-zero group is rejected without losing its saved rows");
  await picker.getByRole("button", { name: "닫기", exact: true }).click();
  assert.deepEqual(await normalizedRows(), savedRows);
  picker = await openGroup();
  await picker.getByLabel("28칸 수량", { exact: true }).fill("9");
  await apply(picker);
  await page.getByRole("button", { name: "수정 취소", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "변경사항을 버릴까요?", exact: true });
  await discard.getByRole("button", { name: "변경사항 버리기", exact: true }).click();
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.deepEqual(await normalizedRows(), savedRows, "Discarding quote edits restores every saved group row");
  assert.equal(await total().innerText(), "465,000원");
}
