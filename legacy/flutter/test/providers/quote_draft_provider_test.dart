import 'package:fishing_rod_calculator/models/calculation_item.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/models/quote_draft.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_draft_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late ProviderContainer container;

  setUp(() => container = ProviderContainer());
  tearDown(() => container.dispose());

  QuoteDraftRod group({
    String id = 'rod-a',
    int quantity = 2,
    double purchaseRate = 0.65,
    double saleRate = 0.8,
  }) => QuoteDraftRod(
    rod: FishingRod(
      id: id,
      name: id == 'rod-a' ? '독야1' : '체어맨 블루',
      brandId: 'brand',
      minValue: 20,
      maxValue: 20,
      usedPrice: 0,
      purchaseLengthPrices: const {20: 15900},
      saleLengthPrices: const {20: 23800},
    ),
    brandName: '송원',
    calculations: [
      CalculationItem(
        fishingRodId: id,
        length: 20,
        quantity: quantity,
        discountRate: purchaseRate,
        saleRate: saleRate,
      ),
    ],
  );

  test('다른 낚시대를 추가해도 이전 낚시대와 수량을 유지한다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.upsertRod(group());
    notifier.upsertRod(group(id: 'rod-b', quantity: 3));
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 2);
    expect(draft.items.map((item) => item.fishingRodId), ['rod-a', 'rod-b']);
    expect(draft.items.map((item) => item.quantity), [2, 3]);
    expect(draft.totalPrice, 50000);
  });

  test('이미 담은 낚시대를 수정하면 중복 추가하지 않고 그 항목만 교체한다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.upsertRod(group());
    notifier.upsertRod(group(id: 'rod-b', quantity: 3));
    notifier.upsertRod(group(quantity: 5, purchaseRate: 0.5));
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 2);
    expect(draft.items.first.quantity, 5);
    expect(draft.items.first.rate, 0.5);
    expect(draft.items.last.quantity, 3);
    expect(draft.totalQuantity, 8);
    expect(draft.totalPrice, 65000);
  });

  test('수량이 0인 칸수는 담지 않고 모든 수량이 0이면 해당 낚시대를 뺀다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.upsertRod(group());
    notifier.upsertRod(group(id: 'rod-b', quantity: 3));
    notifier.upsertRod(group(quantity: 0));
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 1);
    expect(draft.items.single.fishingRodId, 'rod-b');
    expect(draft.totalQuantity, 3);
  });

  test('낚시대를 빼도 고객 정보와 다른 낚시대는 유지한다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.setCustomerName('김민수');
    notifier.setNote('토요일 방문');
    notifier.upsertRod(group());
    notifier.upsertRod(group(id: 'rod-b', quantity: 3));
    notifier.removeRod('rod-a');
    final draft = container.read(quoteDraftProvider);
    expect(draft.customerName, '김민수');
    expect(draft.note, '토요일 방문');
    expect(draft.items.single.fishingRodId, 'rod-b');
  });

  test('매입과 판매를 왕복해도 각 구분의 가격·적용율과 수량을 유지한다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.upsertRod(group());
    notifier.setMode(CalculationMode.sale);
    var draft = container.read(quoteDraftProvider);
    expect(draft.totalPrice, 40000);
    expect(draft.items.single.rate, 0.8);
    notifier.setMode(CalculationMode.purchase);
    draft = container.read(quoteDraftProvider);
    expect(draft.totalPrice, 20000);
    expect(draft.items.single.rate, 0.65);
    expect(draft.totalQuantity, 2);
  });

  test('새로 작성하면 고객 정보와 담은 낚시대를 모두 초기화한다', () {
    final notifier = container.read(quoteDraftProvider.notifier);
    notifier.setCustomerName('김민수');
    notifier.setNote('토요일 방문');
    notifier.setMode(CalculationMode.sale);
    notifier.upsertRod(group());
    notifier.clear();
    final draft = container.read(quoteDraftProvider);
    expect(draft.hasContent, isFalse);
    expect(draft.customerName, isEmpty);
    expect(draft.note, isEmpty);
    expect(draft.rods, isEmpty);
    expect(draft.totalPrice, 0);
    expect(draft.mode, CalculationMode.purchase);
  });
}
