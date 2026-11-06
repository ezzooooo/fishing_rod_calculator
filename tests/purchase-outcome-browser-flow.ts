import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";

/** Purchase-result edits use a separate, development-only in-memory repository. */
export async function purchaseOutcomeBrowserFlow(page: Page): Promise<void> {
  const origin = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  const resultPanel = () => page.getByTestId("purchase-outcome-panel");
  const quoteTable = () => page.getByRole("table", { name: "견적 항목", exact: true });
  const sampleLink = () => page.locator("main").getByRole("link").filter({ hasText: "김민수 매입 견적" });
  const longEquipmentName = "장박용 대형 텐트 롱플라이 호환 확장형 전실 지퍼형 사계절 자립식 모델 전용 수납가방 세트";

  async function navigate(name: "새 견적 만들기" | "견적 내역") {
    const menu = page.getByLabel("메뉴 열기", { exact: true });
    if (await menu.isVisible() && !await menu.evaluate(element => element.closest("details")?.open)) await menu.click();
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await page.getByRole("heading", { name, level: 1, exact: true }).waitFor();
  }
  async function noHorizontalOverflow(label: string) {
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 1, `${label}: horizontal overflow ${dimensions.content} > ${dimensions.viewport}`);
  }
  async function historyAmounts(link: Locator, quoted: string, actual = "—") {
    assert.equal((await link.getByTestId("history-quoted-amount").textContent())?.trim(), quoted, "The quotation has its own unchanged amount column");
    assert.equal((await link.getByTestId("history-actual-amount").textContent())?.trim(), actual, "Final purchase money has a separate column, including explicit zero");
  }
  async function openResult() {
    await resultPanel().getByRole("button", { name: /매입 결과 (기록|수정)/ }).click();
    const dialog = page.getByRole("dialog", { name: "매입 결과 기록", exact: true });
    await dialog.waitFor();
    return dialog;
  }
  async function saveResult() {
    const dialog = page.getByRole("dialog", { name: "매입 결과 기록", exact: true });
    await dialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await resultPanel().waitFor();
  }
  async function backToHistory() {
    await page.getByRole("button", { name: "견적 내역", exact: true }).click();
    await page.getByRole("heading", { name: "견적 내역", exact: true }).waitFor();
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${origin}/quotes`);
  await page.getByRole("heading", { name: "견적 내역", exact: true }).waitFor();
  assert.equal(await page.locator("main").getByText(/^견적\s*금액$/).isVisible(), true);
  assert.equal(await page.locator("main").getByText("최종 매입금액", { exact: true }).isVisible(), true);
  assert.match(await sampleLink().innerText(), /미확인/, "Existing records without a result must remain unconfirmed");
  await historyAmounts(sampleLink(), "210,000원");
  const statusFilter = page.getByLabel("매입 상태 필터", { exact: true });
  await statusFilter.selectOption("in_progress");
  assert.equal(await sampleLink().count(), 0, "Old quotes must not become active consultations automatically");
  await statusFilter.selectOption("unconfirmed");
  await page.getByLabel("견적 검색", { exact: true }).fill("김민수");
  assert.equal(await sampleLink().count(), 1, "Status filtering must compose with the existing quote search");
  await sampleLink().click();
  await resultPanel().waitFor();
  assert.match(await resultPanel().innerText(), /미확인/);
  const originalQuote = await quoteTable().innerText();
  assert.match(originalQuote, /3대/);
  assert.match(originalQuote, /210,000원/);

  let dialog = await openResult();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("partial");
  await dialog.getByLabel("매입일", { exact: true }).fill("2026-11-06");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("60000");
  await dialog.getByTestId("purchase-quantity-0").fill("0");
  await dialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(await dialog.isVisible(), true, "A partial result must include at least one purchased unit");
  await dialog.getByTestId("purchase-quantity-0").fill("3");
  await dialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(await dialog.isVisible(), true, "A full purchase must use completed rather than partial status");
  await dialog.getByTestId("purchase-quantity-0").fill("4");
  await dialog.getByRole("button", { name: "매입 결과 저장", exact: true }).click();
  assert.equal(await dialog.getByTestId("purchase-quantity-0").evaluate((element: HTMLInputElement) => element.validity.rangeOverflow), true, "Purchased units cannot exceed the quoted quantity");
  await dialog.getByTestId("purchase-quantity-0").fill("1");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("60000");
  await saveResult();
  assert.match(await resultPanel().innerText(), /일부 매입/);
  assert.match(await resultPanel().innerText(), /60,000원/);
  assert.match(await resultPanel().innerText(), /1대/);
  assert.equal(await quoteTable().innerText(), originalQuote, "A purchase result must never replace the original quote amounts or quantities");

  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("partial");
  await page.getByLabel("견적 검색", { exact: true }).fill("김민수");
  assert.equal(await sampleLink().count(), 1);
  assert.match(await sampleLink().innerText(), /일부 매입/);
  await historyAmounts(sampleLink(), "210,000원", "60,000원");
  await sampleLink().click();
  dialog = await openResult();
  assert.equal(await dialog.getByTestId("purchase-quantity-0").inputValue(), "1", "Reopening must read the saved partial quantities");
  assert.equal(await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).inputValue(), "60000");
  assert.equal(await dialog.getByLabel("매입일", { exact: true }).inputValue(), "2026-11-06");
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("completed");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("200000");
  await saveResult();
  assert.match(await resultPanel().innerText(), /매입 완료/);
  assert.match(await resultPanel().innerText(), /200,000원/);
  assert.match(await resultPanel().innerText(), /3대/);
  assert.equal(await quoteTable().innerText(), originalQuote);

  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("completed");
  await historyAmounts(sampleLink(), "210,000원", "200,000원");
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`completed purchase history ${viewport.width}`);
    for (const name of ["history-quoted-amount", "history-actual-amount"]) {
      const amount = sampleLink().getByTestId(name);
      assert.equal(await amount.isVisible(), true, `Both amount fields must stay visible at ${viewport.width}px`);
      assert.equal(await amount.evaluate(element => {
        const parent = element.parentElement;
        return !parent || parent.clientWidth === 0 || parent.scrollWidth <= parent.clientWidth + 1;
      }), true, `${name} must fit its amount container at ${viewport.width}px`);
    }
    if (viewport.width >= 1280) {
      const quoted = await sampleLink().getByTestId("history-quoted-amount").boundingBox();
      const actual = await sampleLink().getByTestId("history-actual-amount").boundingBox();
      assert.ok(quoted && actual && actual.x >= quoted.x + quoted.width - 1, "Quoted and final purchase amounts must occupy independent horizontal columns");
      assert.ok(Math.abs(quoted.y - actual.y) <= 2, "Both amount columns must share the same table row");
      const identityWidth = await sampleLink().getByRole("heading").evaluate(element => element.parentElement?.getBoundingClientRect().width ?? Infinity);
      assert.ok(identityWidth <= 221, `The quotation/customer column should stay compact, received ${identityWidth}px`);
    } else {
      await page.screenshot({ path: "outputs/next-migration/purchase-history-columns-mobile.png", fullPage: false });
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/purchase-history-columns-laptop.png", fullPage: false });
  await sampleLink().click();

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  await page.getByRole("button", { name: "독야1 32칸 항목 수정", exact: true }).click();
  const itemEditor = page.getByRole("dialog", { name: "견적 항목 수정", exact: true });
  await itemEditor.getByLabel("수량", { exact: true }).fill("2");
  await itemEditor.getByRole("button", { name: "적용", exact: true }).click();
  await page.getByRole("button", { name: "수정 내용 저장", exact: true }).click();
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.match(await quoteTable().innerText(), /2대/);
  assert.match(await quoteTable().innerText(), /140,000원/);
  assert.match(await resultPanel().innerText(), /200,000원/, "Editing a quote must preserve the independent actual purchase amount");
  assert.match(await resultPanel().innerText(), /3대/, "A recorded purchase keeps the original item snapshot even after quote edits");
  dialog = await openResult();
  await dialog.getByRole("button", { name: "현재 견적 품목으로 다시 선택", exact: true }).click();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("partial");
  await dialog.getByTestId("purchase-quantity-0").fill("1");
  assert.equal(await dialog.getByTestId("purchase-quantity-0").getAttribute("max"), "2", "Only an explicit refresh can replace the purchase source with the revised quote");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("60000");
  await saveResult();

  dialog = await openResult();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("in_progress");
  await saveResult();
  assert.match(await resultPanel().innerText(), /상담 중/);
  assert.doesNotMatch(await resultPanel().innerText(), /60,000원|200,000원/, "An active consultation cannot retain stale completed-purchase money");
  dialog = await openResult();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("not_completed");
  await dialog.getByLabel("미성사 사유 (선택)", { exact: true }).selectOption({ label: "가격 불일치" });
  await dialog.getByLabel("매입 결과 메모 (선택)", { exact: true }).fill("최종 매입금액 협의가 되지 않아 종료");
  await saveResult();
  assert.match(await resultPanel().innerText(), /미성사/);
  assert.match(await resultPanel().innerText(), /가격 불일치/);
  assert.match(await resultPanel().innerText(), /최종 매입금액 협의가 되지 않아 종료/);
  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("completed");
  assert.equal(await sampleLink().count(), 0);
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("not_completed");
  assert.equal(await sampleLink().count(), 1);
  await historyAmounts(sampleLink(), "140,000원");

  await navigate("새 견적 만들기");
  await page.getByLabel("고객명 (선택)", { exact: true }).fill("매입 결과 검증 고객");
  await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
  let picker = page.getByRole("dialog", { name: "낚시대 담기", exact: true });
  await picker.getByLabel("낚시대 선택", { exact: true }).selectOption("rod-1");
  await picker.getByLabel("32칸 수량", { exact: true }).fill("2");
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "용품 추가", exact: true }).click();
  picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
  await picker.getByLabel("등록 제품 (선택)", { exact: true }).selectOption("equipment-product-1");
  await picker.getByLabel("제품명", { exact: true }).fill(longEquipmentName);
  await picker.getByLabel("수량", { exact: true }).fill("2");
  await picker.getByRole("checkbox", { name: /롱플라이/ }).check();
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  assert.equal(await page.getByTestId("quote-total").innerText(), "350,000원");
  await page.getByRole("button", { name: "견적 저장", exact: true }).click();
  const quoteSave = page.getByRole("dialog", { name: "견적 저장", exact: true });
  await quoteSave.getByRole("button", { name: "저장", exact: true }).click();
  await page.waitForURL(/\/quotes\/detail\/?\?id=/);
  await resultPanel().waitFor();
  assert.match(await resultPanel().innerText(), /상담 중/, "New purchase quotes start as active consultations");
  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("in_progress");
  const activeMixedLink = page.locator("main").getByRole("link").filter({ hasText: "매입 결과 검증 고객 매입 견적" });
  await historyAmounts(activeMixedLink, "350,000원");
  await activeMixedLink.click();
  const mixedOriginal = await quoteTable().innerText();
  assert.match(mixedOriginal, /350,000원|210,000원/);
  dialog = await openResult();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("partial");
  assert.equal(await dialog.locator('[data-testid^="purchase-quantity-"]').count(), 2, "Both rods and equipment need independent acquired quantities");
  await dialog.getByTestId("purchase-quantity-0").fill("1");
  await dialog.getByTestId("purchase-quantity-1").fill("1");
  await dialog.getByLabel("매입일", { exact: true }).fill("2026-11-06");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("160001");
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`purchase result ${viewport.width}`);
    const save = await dialog.getByRole("button", { name: "매입 결과 저장", exact: true }).boundingBox();
    assert.ok(save && save.y >= 0 && save.y + save.height <= viewport.height, `Purchase save must remain visible at ${viewport.width}px`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/purchase-outcome-laptop.png", fullPage: false });
  await saveResult();
  assert.match(await resultPanel().innerText(), /일부 매입/);
  assert.match(await resultPanel().innerText(), /160,001원/, "Actual money is independent of rod thousand-won rounding");
  assert.match(await resultPanel().innerText(), /1대/);
  assert.match(await resultPanel().innerText(), /1동/);
  assert.equal(await quoteTable().innerText(), mixedOriginal, "Recording a mixed partial purchase preserves all original quote components and prices");
  await page.getByRole("button", { name: "견적서 미리보기", exact: true }).click();
  const receipt = page.getByRole("dialog", { name: "견적서 미리보기", exact: true });
  assert.doesNotMatch(await receipt.innerText(), /실제 매입금액|미성사 사유|160,001원/, "Internal purchase results must not leak into the customer-facing quotation");
  await receipt.getByRole("button", { name: "닫기", exact: true }).last().click();
  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("partial");
  await page.getByLabel("견적 검색", { exact: true }).fill("매입 결과 검증 고객");
  const mixedLink = page.locator("main").getByRole("link").filter({ hasText: "매입 결과 검증 고객 매입 견적" });
  assert.equal(await mixedLink.count(), 1);
  await historyAmounts(mixedLink, "350,000원", "160,001원");
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`long mixed purchase history ${viewport.width}`);
    if (viewport.width >= 1280) {
      const itemLines = await mixedLink.locator("p").filter({ hasText: longEquipmentName }).evaluate(element => ({
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(window.getComputedStyle(element).lineHeight),
      }));
      assert.ok(itemLines.height > itemLines.lineHeight * 1.5, "Long product names must use a second line instead of being forced into one line");
      assert.ok(itemLines.height <= itemLines.lineHeight * 2 + 1, "Product names must remain limited to two lines on laptop screens");
    } else {
      const amountContainerFits = await mixedLink.getByTestId("history-actual-amount").evaluate(element => {
        const parent = element.parentElement;
        return !!parent && parent.scrollWidth <= parent.clientWidth + 1;
      });
      assert.equal(amountContainerFits, true, "The separate mobile amount fields must fit their shared grid");
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/purchase-history-columns-long-items-laptop.png", fullPage: false });
  await mixedLink.click();
  assert.match(await resultPanel().innerText(), /160,001원/);
  assert.equal(await quoteTable().innerText(), mixedOriginal);

  dialog = await openResult();
  await dialog.getByLabel("매입 진행 상태", { exact: true }).selectOption("completed");
  await dialog.getByLabel("실제 매입금액 (원)", { exact: true }).fill("0");
  await saveResult();
  assert.equal(await quoteTable().innerText(), mixedOriginal, "An explicitly recorded zero must not alter the quoted prices");
  await backToHistory();
  await page.getByLabel("매입 상태 필터", { exact: true }).selectOption("completed");
  await page.getByLabel("견적 검색", { exact: true }).fill("매입 결과 검증 고객");
  await historyAmounts(mixedLink, "350,000원", "0원");
}
