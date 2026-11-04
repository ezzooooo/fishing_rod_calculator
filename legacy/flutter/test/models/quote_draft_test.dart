import 'package:fishing_rod_calculator/models/calculation_item.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/models/quote_draft.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const rod = FishingRod(
    id: 'rod-a',
    name: '독야1',
    brandId: 'brand-a',
    minValue: 20,
    maxValue: 22,
    usedPrice: 0,
    purchaseLengthPrices: {20: 15900, 22: 20800},
    saleLengthPrices: {20: 23800, 22: 30200},
  );
  const calculation = CalculationItem(
    fishingRodId: 'rod-a',
    length: 20,
    quantity: 2,
    discountRate: 0.65,
    saleRate: 0.8,
  );
  QuoteDraftRod group() =>
      QuoteDraftRod(rod: rod, brandName: '송원', calculations: [calculation]);

  test('작성 중 견적은 매입과 판매의 단가·적용율을 독립적으로 계산한다', () {
    final purchase = QuoteDraft(rods: [group()]);
    final sale = purchase.copyWith(mode: CalculationMode.sale);
    expect(purchase.items.single.unitPrice, 15900);
    expect(purchase.items.single.rate, 0.65);
    expect(purchase.items.single.finalUnitPrice, 10000);
    expect(purchase.totalOriginalPrice, 31800);
    expect(purchase.totalPrice, 20000);
    expect(sale.items.single.unitPrice, 23800);
    expect(sale.items.single.rate, 0.8);
    expect(sale.items.single.finalUnitPrice, 20000);
    expect(sale.totalOriginalPrice, 47600);
    expect(sale.totalPrice, 40000);
    expect(sale.totalQuantity, 2);
  });

  test('여러 낚시대가 같은 칸수를 사용해도 독립된 견적 항목으로 합산한다', () {
    final secondRod = rod.copyWith(id: 'rod-b', name: '체어맨 블루');
    final draft = QuoteDraft(
      customerName: '김민수',
      rods: [
        group(),
        QuoteDraftRod(
          rod: secondRod,
          brandName: 'DIF',
          calculations: [
            calculation.copyWith(fishingRodId: 'rod-b', quantity: 3),
          ],
        ),
      ],
    );
    expect(draft.rodCount, 2);
    expect(draft.items.map((item) => item.length), [20, 20]);
    expect(draft.items.map((item) => item.fishingRodName), ['독야1', '체어맨 블루']);
    expect(draft.totalQuantity, 5);
    expect(draft.totalPrice, 50000);
  });

  test('담을 때의 이름과 가격표를 보존해 카탈로그 변경 없이 견적을 표시한다', () {
    final draft = QuoteDraft(rods: [group()]);
    final changedCatalogue = rod.copyWith(
      name: '변경된 이름',
      purchaseLengthPrices: {20: 999000},
    );
    expect(changedCatalogue.name, '변경된 이름');
    expect(draft.items.single.fishingRodName, '독야1');
    expect(draft.items.single.unitPrice, 15900);
    expect(draft.totalPrice, 20000);
  });

  test('외부 리스트 변경으로 작성 중 견적을 바꿀 수 없다', () {
    final calculations = [calculation];
    final rodGroup = QuoteDraftRod(
      rod: rod,
      brandName: '송원',
      calculations: calculations,
    );
    final groups = [rodGroup];
    final draft = QuoteDraft(rods: groups);
    calculations.clear();
    groups.clear();
    expect(draft.totalQuantity, 2);
    expect(() => draft.rods.clear(), throwsUnsupportedError);
    expect(() => rodGroup.calculations.clear(), throwsUnsupportedError);
    expect(() => draft.items.clear(), throwsUnsupportedError);
  });

  test('고객명이나 메모만 입력해도 새로 작성 전 확인할 내용으로 취급한다', () {
    expect(QuoteDraft().hasContent, isFalse);
    expect(QuoteDraft(customerName: '   ', note: '\n').hasContent, isFalse);
    expect(QuoteDraft(customerName: '김민수').hasContent, isTrue);
    expect(QuoteDraft(note: '다음 주 방문').hasContent, isTrue);
    expect(QuoteDraft(rods: [group()]).hasContent, isTrue);
  });
}
