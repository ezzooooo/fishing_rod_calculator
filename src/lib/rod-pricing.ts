import type { PriceMap } from "./domain";

/** Each selected length is one price step, matching the original rod editor. */
export function generateSteppedRodPrices(
  lengths: readonly number[],
  baseLength: number,
  basePrice: number,
  priceStep: number,
): PriceMap {
  if (!lengths.length) throw new Error("가격을 적용할 칸수를 먼저 선택해주세요.");
  if (lengths.some(length => !Number.isInteger(length) || length < 1 || length > 200)) {
    throw new Error("칸수는 1~200의 정수로 입력해주세요.");
  }
  if (!Number.isInteger(baseLength) || !lengths.includes(baseLength)) {
    throw new Error("선택한 칸수 중에서 기준 칸수를 선택해주세요.");
  }
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("기준 금액은 0 이상의 숫자로 입력해주세요.");
  }
  if (!Number.isFinite(priceStep) || priceStep < 0) {
    throw new Error("칸수별 가격 차이는 0 이상의 숫자로 입력해주세요.");
  }

  const selected = [...new Set(lengths)].sort((left, right) => left - right);
  const baseIndex = selected.indexOf(baseLength);
  const prices: PriceMap = {};
  for (const [index, length] of selected.entries()) {
    const price = basePrice + (index - baseIndex) * priceStep;
    if (!Number.isFinite(price)) {
      throw new Error("계산할 수 있는 금액 범위를 초과했습니다. 기준 금액과 가격 차이를 줄여주세요.");
    }
    prices[String(length)] = Math.max(0, price);
  }
  return prices;
}
