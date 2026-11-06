import assert from "node:assert/strict";
import type { Page } from "playwright";

/** Draft catalogue writes stay inside a fresh, development-only demo repository. */
export async function equipmentDraftBrowserFlow(page: Page): Promise<void> {
  const origin = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
  async function noHorizontalOverflow(label: string) {
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 1, `${label}: horizontal overflow ${dimensions.content} > ${dimensions.viewport}`);
  }
  async function categoryCount(expected: number) {
    await page.getByRole("button", { name: "텐트 분류 수정", exact: true }).waitFor();
    assert.equal(await page.locator("main table tbody > tr").count(), expected);
  }
  async function openImport() {
    await page.getByRole("button", { name: "분류 초안 등록", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "분류 초안 등록 확인", exact: true });
    await dialog.waitFor();
    return dialog;
  }
  async function openCategory(name: string) {
    await page.getByRole("button", { name: `${name} 분류 수정`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "용품 분류 수정", exact: true });
    await dialog.waitFor();
    return dialog;
  }
  async function navigateToQuote() {
    const menu = page.getByLabel("메뉴 열기", { exact: true });
    if (await menu.isVisible() && !await menu.evaluate(element => element.closest("details")?.open)) await menu.click();
    await page.getByRole("link", { name: "새 견적 만들기", exact: true }).click();
    await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).waitFor();
  }

  await page.goto(`${origin}/products?tab=categories`);
  await page.getByRole("heading", { name: "용품 분류·구성 관리", exact: true }).waitFor();
  await categoryCount(3);
  let confirmation = await openImport();
  assert.match(await confirmation.innerText(), /새 분류 17개/);
  assert.match(await confirmation.innerText(), /기존 구성 보완 3개/);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`draft confirmation ${viewport.width}`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: "outputs/next-migration/category-draft-laptop.png", fullPage: false });
  await confirmation.getByRole("button", { name: "취소", exact: true }).click();
  await confirmation.waitFor({ state: "hidden" });
  await categoryCount(3);

  confirmation = await openImport();
  await confirmation.getByRole("button", { name: "확인 후 등록", exact: true }).click();
  await confirmation.waitFor({ state: "hidden" });
  await categoryCount(20);
  assert.equal(await page.getByRole("button", { name: "좌대 분류 수정", exact: true }).count(), 1, "An existing alias category keeps its name and identity");
  assert.equal(await page.getByRole("button", { name: "좌대·발판 분류 수정", exact: true }).count(), 0, "An alias must not create a second category");
  confirmation = await openImport();
  assert.match(await confirmation.innerText(), /새 분류 0개/);
  assert.match(await confirmation.innerText(), /기존 구성 보완 0개/);
  assert.match(await confirmation.innerText(), /이미 반영 20개/);
  assert.equal(await confirmation.getByRole("button", { name: "확인 후 등록", exact: true }).isDisabled(), true, "A repeated draft import must be a no-op");
  await confirmation.getByRole("button", { name: "취소", exact: true }).click();
  await confirmation.waitFor({ state: "hidden" });

  let category = await openCategory("텐트");
  assert.equal(await category.getByLabel("구성 그룹 1 선택지 1 이름", { exact: true }).inputValue(), "롱플라이");
  assert.equal(await category.getByLabel("구성 그룹 1 선택지 1 매입 추가금액", { exact: true }).inputValue(), "5000");
  assert.equal(await category.getByLabel("구성 그룹 1 선택지 1 판매 추가금액", { exact: true }).inputValue(), "8000", "Existing catalogue prices must survive draft merging");
  await category.getByRole("button", { name: "취소", exact: true }).click();
  await category.waitFor({ state: "hidden" });

  category = await openCategory("파라솔");
  const draftPrices = category.getByRole("spinbutton");
  assert.ok(await draftPrices.count() > 0);
  for (const price of await draftPrices.all()) {
    assert.equal(await price.inputValue(), "", "Unpriced draft choices must display a blank, not zero");
    assert.equal(await price.getAttribute("placeholder"), "미정");
    assert.equal(await price.getAttribute("required"), null, "Unknown catalogue prices can be saved");
  }
  await category.getByRole("button", { name: "분류 저장", exact: true }).click();
  await category.waitFor({ state: "hidden" });
  category = await openCategory("파라솔");
  assert.equal(await category.getByLabel("구성 그룹 1 선택지 1 매입 추가금액", { exact: true }).inputValue(), "", "Saving and reopening must retain an unknown price");
  assert.equal(await category.getByLabel("구성 그룹 1 선택지 1 판매 추가금액", { exact: true }).inputValue(), "");
  await category.getByRole("button", { name: "취소", exact: true }).click();
  await category.waitFor({ state: "hidden" });
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noHorizontalOverflow(`draft categories ${viewport.width}`);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await navigateToQuote();
  await page.getByLabel("고객명 (선택)", { exact: true }).fill("구성 초안 검증 고객");
  await page.getByRole("button", { name: "용품 추가", exact: true }).click();
  let picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
  await picker.getByLabel("분류", { exact: true }).selectOption({ label: "파라솔" });
  await picker.getByLabel("제품명", { exact: true }).fill("미정 구성 파라솔");
  await picker.getByLabel("본체 매입 단가 (원)", { exact: true }).fill("100000");
  await picker.getByLabel("수량", { exact: true }).fill("2");
  await picker.getByLabel("월·차양 파라솔 월 수량", { exact: true }).fill("1");
  const componentPrice = picker.getByLabel("파라솔 월 추가 단가", { exact: true });
  assert.equal(await componentPrice.inputValue(), "");
  assert.equal(await componentPrice.getAttribute("required"), "", "A selected unknown component requires an explicit quote price");
  assert.match(await picker.innerText(), /금액 입력 필요/);
  const calculation = picker.getByLabel("용품 계산 내역", { exact: true });
  assert.match(await calculation.innerText(), /구성 금액\s*금액 입력 필요/);
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  assert.equal(await picker.isVisible(), true, "Missing component prices cannot silently become free");
  assert.equal(await componentPrice.evaluate((element: HTMLInputElement) => element.validity.valueMissing), true);
  await componentPrice.fill("0");
  assert.match(await calculation.innerText(), /구성 금액\s*0원/);
  assert.match(await picker.locator("footer").innerText(), /200,000원/, "An explicitly entered zero surcharge is valid");
  await componentPrice.fill("5000");
  assert.match(await picker.locator("footer").innerText(), /210,000원/, "Add the component once per unit, then multiply product quantity once");
  await page.mouse.click(5, 5);
  assert.equal(await picker.isVisible(), true, "A backdrop click must preserve equipment inputs just like rod quantities");
  assert.equal(await picker.getByLabel("제품명", { exact: true }).inputValue(), "미정 구성 파라솔");
  assert.equal(await picker.getByLabel("수량", { exact: true }).inputValue(), "2");
  assert.equal(await componentPrice.inputValue(), "5000");
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  assert.equal(await page.getByTestId("quote-total").textContent(), "210,000원");

  await page.getByRole("button", { name: "용품 추가", exact: true }).click();
  picker = page.getByRole("dialog", { name: "용품 추가", exact: true });
  await picker.getByLabel("분류", { exact: true }).selectOption({ label: "파라솔" });
  await picker.getByLabel("제품명", { exact: true }).fill("구성 미선택 파라솔");
  await picker.getByLabel("본체 매입 단가 (원)", { exact: true }).fill("70000");
  await picker.getByRole("button", { name: "견적에 담기", exact: true }).click();
  await picker.waitFor({ state: "hidden" });
  assert.equal(await page.getByTestId("quote-total").textContent(), "280,000원", "Unselected unknown choices must not block a quote");
  await page.getByRole("button", { name: "견적 저장", exact: true }).click();
  const save = page.getByRole("dialog");
  await save.getByRole("button", { name: "저장", exact: true }).click();
  await page.waitForURL(/\/quotes\/detail\/?\?id=/);
  await page.getByRole("heading", { name: "견적 상세", exact: true }).waitFor();
  assert.match(await page.locator("main").innerText(), /미정 구성 파라솔/);
  assert.match(await page.locator("main").innerText(), /구성 미선택 파라솔/);
  assert.match(await page.locator("main").innerText(), /280,000원/);
}
