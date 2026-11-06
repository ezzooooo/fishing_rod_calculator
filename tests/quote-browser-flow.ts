import assert from "node:assert/strict";
import type { Page } from "playwright";

export async function quoteBrowserFlow(page: Page): Promise<void> {
  const origin = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(origin);
  await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).waitFor();
  const customer = page.getByLabel("고객명 (선택)", { exact: true });
  await customer.fill("전환 검증 고객");
  await customer.press("Shift+Tab");
  await page.keyboard.press("Tab");
  assert.deepEqual(await customer.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd]), [0, "전환 검증 고객".length], "keyboard focus should select the entire customer input");
  await page.getByLabel("메모 (선택)", { exact: true }).fill("여러 종류를 한 번에 저장하는 검증 견적");

  await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
  const protectedPicker = page.getByRole("dialog", { name: "낚시대 담기", exact: true });
  await protectedPicker.getByLabel("낚시대 선택", { exact: true }).selectOption("rod-1");
  await protectedPicker.getByLabel("32칸 수량", { exact: true }).fill("3");
  await protectedPicker.getByLabel("32칸 적용율", { exact: true }).selectOption("0.65");
  await page.mouse.click(2, 2);
  assert.equal(await protectedPicker.isVisible(), true, "Backdrop clicks must not close an unfinished rod picker");
  assert.equal(await protectedPicker.getByLabel("32칸 수량", { exact: true }).inputValue(), "3");
  assert.equal(await protectedPicker.getByLabel("32칸 적용율", { exact: true }).inputValue(), "0.65");
  await protectedPicker.getByRole("button", { name: "닫기", exact: true }).click();
  await protectedPicker.waitFor({ state: "hidden" });
  assert.equal(await page.getByTestId("quote-total").textContent(), "0원", "Explicit close must still cancel the unsent rod");

  let keyboardVerified = false;
  async function addRod(id: string, length: number, quantity: number, rate?: string) {
    await page.getByRole("button", { name: "낚시대 추가", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "낚시대 선택", exact: true }).selectOption(id);
    if (!keyboardVerified && id === "rod-1") {
      const firstQuantity = dialog.getByRole("spinbutton", { name: "28칸 수량", exact: true });
      await firstQuantity.fill("1");
      await firstQuantity.press("Tab");
      const nextQuantity = dialog.getByRole("spinbutton", { name: "30칸 수량", exact: true });
      assert.equal(await nextQuantity.evaluate(element => element === document.activeElement), true, "Tab should skip the rate and move to the next quantity");
      await page.keyboard.type("1");
      assert.equal(await nextQuantity.inputValue(), "1", "Tab focus should select all, so one keystroke replaces zero");
      await nextQuantity.press("Shift+Tab");
      assert.equal(await firstQuantity.evaluate(element => element === document.activeElement), true, "Shift+Tab should skip the rate and return to the previous quantity");
      await nextQuantity.fill("0");
      await dialog.getByRole("spinbutton", { name: "36칸 수량", exact: true }).press("Tab");
      assert.equal(await dialog.getByRole("button", { name: "견적에 담기", exact: true }).evaluate(element => element === document.activeElement), true, "Tab from the last quantity should reach the apply action");
      await firstQuantity.press("Enter");
      assert.equal(await dialog.getByRole("spinbutton", { name: "30칸 수량", exact: true }).evaluate(element => element === document.activeElement), true, "Enter should move to the next quantity");
      assert.equal(await dialog.isVisible(), true, "Enter should not submit the entire rod picker");
      await firstQuantity.fill("0");
      keyboardVerified = true;
    }
    await dialog.getByRole("spinbutton", { name: `${length}칸 수량`, exact: true }).fill(String(quantity));
    if (rate) await dialog.getByRole("combobox", { name: `${length}칸 적용율`, exact: true }).selectOption(rate);
    await dialog.getByRole("button", { name: "견적에 담기", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
  }
  const total = page.getByTestId("quote-total");
  await addRod("rod-1", 32, 3, "0.65");
  assert.equal(await total.textContent(), "195,000원");
  await addRod("rod-2", 28, 2);
  assert.equal(await total.textContent(), "327,000원");
  assert.match(await page.getByTestId("draft-rod-rod-1").innerText(), /32칸\s*3대/);
  assert.match(await page.getByTestId("draft-rod-rod-2").innerText(), /28칸\s*2대/);

  const firstRodBeforeUndo = await page.getByTestId("draft-rod-rod-1").innerText();
  await page.getByRole("button", { name: "독야1 빼기", exact: true }).click();
  assert.equal(await total.textContent(), "132,000원");
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  assert.equal(await total.textContent(), "327,000원", "Undo must restore saved quantities, rates and unit-price snapshots");
  assert.equal(await page.getByTestId("draft-rod-rod-1").innerText(), firstRodBeforeUndo);
  assert.deepEqual(await page.locator('[data-testid^="draft-rod-"]').evaluateAll(elements => elements.map(element => element.getAttribute("data-testid"))), ["draft-rod-rod-1", "draft-rod-rod-2"], "Undo should restore the removed group at its original position");
  assert.equal(await page.getByRole("button", { name: "되돌리기", exact: true }).count(), 0);

  await page.getByRole("button", { name: "판매", exact: true }).click();
  assert.equal(await total.textContent(), "449,000원", "sale must use independent default sale rates and round each unit upward");
  await page.getByRole("button", { name: "매입", exact: true }).click();
  assert.equal(await total.textContent(), "327,000원", "returning to purchase must preserve purchase rates");

  await page.getByRole("button", { name: "독야1 수정", exact: true }).click();
  const editor = page.getByRole("dialog");
  assert.equal(await editor.getByRole("spinbutton", { name: "32칸 수량", exact: true }).inputValue(), "3");
  assert.equal(await editor.getByRole("combobox", { name: "32칸 적용율", exact: true }).inputValue(), "0.65");
  await editor.getByRole("spinbutton", { name: "32칸 수량", exact: true }).fill("4");
  await editor.getByRole("button", { name: "변경 반영", exact: true }).click();
  assert.equal(await total.textContent(), "392,000원");
  assert.match(await page.getByTestId("draft-rod-rod-2").innerText(), /28칸\s*2대/, "editing one rod should retain the other rod");
  if (await page.getByRole("button", { name: "알림 닫기", exact: true }).count()) await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const bar = await page.getByTestId("quote-save-bar").boundingBox();
    const firstRod = await page.getByTestId("draft-rod-rod-1").boundingBox();
    const secondRod = await page.getByTestId("draft-rod-rod-2").boundingBox();
    const save = await page.getByRole("button", { name: "견적 저장", exact: true }).boundingBox();
    const amount = await total.boundingBox();
    assert.ok(bar && firstRod && secondRod && save && amount, "laptop quote controls should render");
    assert.ok(firstRod.y >= 0 && firstRod.y + firstRod.height <= bar.y, "first rod should fit above the save bar on a laptop");
    assert.ok(secondRod.y >= 0 && secondRod.y + secondRod.height <= bar.y, "second rod should fit above the save bar on a laptop");
    assert.ok(save.y >= 0 && save.y + save.height <= viewport.height, "save button should remain in the laptop viewport");
    assert.ok(amount.y + amount.height <= bar.y, "quote total should remain above the save bar");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "laptop quote layout must not overflow horizontally");
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/quote-laptop.png", fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/quote-desktop.png", fullPage: false });

  await page.getByRole("button", { name: "견적서 미리보기", exact: true }).click();
  const preview = page.getByRole("dialog");
  assert.match(await preview.innerText(), /독야1/);
  assert.match(await preview.innerText(), /체어맨 블루/);
  assert.match(await preview.innerText(), /392,000원/);
  const firstReceiptGroup = preview.getByRole("region", { name: "[송원] 독야1 견적", exact: true });
  const secondReceiptGroup = preview.getByRole("region", { name: "[DIF] 체어맨 블루 견적", exact: true });
  assert.match(await firstReceiptGroup.innerText(), /총 가격\s*400,000원/);
  assert.match(await firstReceiptGroup.innerText(), /평균 적용율\s*65%/);
  assert.match(await secondReceiptGroup.innerText(), /평균 적용율\s*69\.47%/);
  const receiptTotal = preview.getByRole("region", { name: "전체 합계", exact: true });
  assert.match(await receiptTotal.innerText(), /총 가격\s*590,000원/);
  assert.match(await receiptTotal.innerText(), /평균 적용율\s*66\.44%/);
  assert.match(await receiptTotal.innerText(), /매입가격\s*392,000원/);
  await preview.getByRole("button", { name: "닫기", exact: true }).last().click();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "견적 복사", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /전환 검증 고객/);
  assert.match(copied, /독야1/);
  assert.match(copied, /체어맨 블루/);
  assert.match(copied, /392,000원/);
  assert.match(copied, /전체 합계\n총 대수: 6대\n총 가격: 590,000원\n평균 적용율: 66\.44%\n총 매입가격: 392,000원/);

  await page.getByRole("button", { name: "견적 저장", exact: true }).click();
  const saveDialog = page.getByRole("dialog");
  assert.equal(await saveDialog.getByLabel("견적 제목", { exact: true }).inputValue(), "전환 검증 고객 매입 견적");
  await saveDialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.waitForURL(/\/quotes\/detail\/?\?id=/);
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.match(await page.locator("main").innerText(), /전환 검증 고객 매입 견적/);
  assert.match(await page.locator("main").innerText(), /392,000원/);
  assert.equal(await page.getByRole("table", { name: "견적 항목", exact: true }).locator("tbody").count(), 2, "saved item table should be grouped by rod type");

  await page.getByRole("button", { name: "견적 수정", exact: true }).click();
  await page.getByRole("button", { name: "독야1 32칸 항목 수정", exact: true }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("수량", { exact: true }).fill("5");
  await itemDialog.getByRole("button", { name: "적용", exact: true }).click();
  assert.match(await page.getByRole("table", { name: "견적 항목", exact: true }).getByRole("row", { name: /32칸.*5대/ }).innerText(), /65,000원/);
  await page.getByRole("button", { name: "수정 내용 저장", exact: true }).click();
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.match(await page.locator("main").innerText(), /457,000원/);

  await page.getByRole("button", { name: "견적 내역", exact: true }).click();
  await page.getByRole("heading", { name: "견적 내역", exact: true }).waitFor();
  await page.getByRole("textbox", { name: "견적 검색", exact: true }).fill("전환 검증 고객");
  assert.equal(await page.locator("main").getByRole("link", { name: /전환 검증 고객 매입 견적/ }).count(), 1, "one save should produce one customer quote");
  assert.match(await page.locator("main").innerText(), /457,000원/);
  await page.locator("main").getByRole("link", { name: "새 견적 만들기", exact: true }).click();
  await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).waitFor();
  assert.equal(await customer.inputValue(), "", "successful save should clear customer information");
  assert.equal(await total.textContent(), "0원");

  await customer.fill("초기화 검증");
  await addRod("rod-1", 32, 2);
  await page.getByRole("button", { name: "독야1 빼기", exact: true }).click();
  assert.equal(await total.textContent(), "0원");
  assert.equal(await customer.inputValue(), "초기화 검증");
  await addRod("rod-1", 32, 1, "0.5");
  assert.equal(await total.textContent(), "50,000원");
  assert.equal(await page.getByRole("button", { name: "되돌리기", exact: true }).count(), 0, "Adding the same rod again must invalidate the old undo instead of replacing the new quantities");
  await page.getByRole("button", { name: "독야1 빼기", exact: true }).click();
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  assert.equal(await total.textContent(), "50,000원", "Only the latest removed group should be restored");
  await page.getByRole("button", { name: "독야1 빼기", exact: true }).click();
  await addRod("rod-2", 28, 1);
  await page.getByRole("button", { name: "새로 작성", exact: true }).click();
  const reset = page.getByRole("dialog");
  await reset.getByRole("button", { name: "계속 작성", exact: true }).click();
  assert.equal(await total.textContent(), "66,000원");
  await page.getByRole("button", { name: "새로 작성", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "새로 작성", exact: true }).click();
  assert.equal(await total.textContent(), "0원");
  assert.equal(await customer.inputValue(), "");
  assert.equal(await page.getByRole("button", { name: "되돌리기", exact: true }).count(), 0, "A new draft must never restore a previous customer's removed rod");

  await page.setViewportSize({ width: 390, height: 844 });
  await customer.fill("모바일 고객");
  await addRod("rod-1", 32, 2);
  await addRod("rod-2", 28, 1);
  assert.equal(await total.textContent(), "206,000원");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "mobile quote layout must not overflow horizontally");
  assert.equal(await page.getByRole("button", { name: "견적 저장", exact: true }).isEnabled(), true);
  if (await page.getByRole("button", { name: "알림 닫기", exact: true }).count()) await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: "outputs/next-migration/quote-mobile.png", fullPage: true });
}
