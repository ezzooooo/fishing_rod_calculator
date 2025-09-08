import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('CalculationProvider Tests', () {
    late ProviderContainer container;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('초기 상태는 빈 리스트여야 함', () {
      // When
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, isEmpty);
    });

    test('계산 항목 추가 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;
      const quantity = 5;
      const discountRate = 0.7;

      // When
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: quantity,
        discountRate: discountRate,
      );
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, hasLength(1));
      final item = calculations.first;
      expect(item.fishingRodId, equals(fishingRodId));
      expect(item.length, equals(length));
      expect(item.quantity, equals(quantity));
      expect(item.discountRate, equals(discountRate));
    });

    test('같은 낚시대, 같은 길이의 계산 항목 중복 추가 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;

      // When - 같은 낚시대, 같은 길이로 두 번 추가
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 3,
        discountRate: 0.7,
      );
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 5,
        discountRate: 0.6,
      );
      final calculations = container.read(calculationProvider);

      // Then - 마지막 값으로 업데이트되어야 함
      expect(calculations, hasLength(1));
      final item = calculations.first;
      expect(item.quantity, equals(5));
      expect(item.discountRate, equals(0.6));
    });

    test('다른 길이의 계산 항목 추가 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';

      // When
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 18,
        quantity: 3,
        discountRate: 0.7,
      );
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, hasLength(2));
      expect(calculations.map((c) => c.length).toList(), containsAll([18, 20]));
    });

    test('수량 업데이트 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 3,
        discountRate: 0.7,
      );

      // When
      notifier.updateQuantity(fishingRodId, length, 8);
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, hasLength(1));
      expect(calculations.first.quantity, equals(8));
    });

    test('수량을 0으로 업데이트하면 항목 제거 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 3,
        discountRate: 0.7,
      );

      // When
      notifier.updateQuantity(fishingRodId, length, 0);
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, isEmpty);
    });

    test('할인율 업데이트 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 3,
        discountRate: 0.7,
      );

      // When
      notifier.updateDiscountRate(fishingRodId, length, 0.6);
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, hasLength(1));
      expect(calculations.first.discountRate, equals(0.6));
    });

    test('계산 항목 제거 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 18,
        quantity: 3,
        discountRate: 0.7,
      );
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      notifier.removeCalculationItem(fishingRodId, 18);
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, hasLength(1));
      expect(calculations.first.length, equals(20));
    });

    test('모든 계산 항목 제거 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 18,
        quantity: 3,
        discountRate: 0.7,
      );
      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      notifier.clearAll();
      final calculations = container.read(calculationProvider);

      // Then
      expect(calculations, isEmpty);
    });

    test('계산 항목 조회 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);
      const fishingRodId = 'rod_001';
      const length = 20;

      notifier.addCalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      final item = notifier.getCalculationItem(fishingRodId, length);

      // Then
      expect(item, isNotNull);
      expect(item!.fishingRodId, equals(fishingRodId));
      expect(item.length, equals(length));
      expect(item.quantity, equals(5));
    });

    test('존재하지 않는 계산 항목 조회 테스트', () {
      // Given
      final notifier = container.read(calculationProvider.notifier);

      // When
      final item = notifier.getCalculationItem('rod_001', 20);

      // Then
      expect(item, isNull);
    });

    test('총 수량 계산 테스트', () async {
      // Given
      final notifier = container.read(calculationProvider.notifier);

      notifier.addCalculationItem(
        fishingRodId: 'rod_001',
        length: 18,
        quantity: 3,
        discountRate: 0.7,
      );
      notifier.addCalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      final totalQuantity = container.read(totalQuantityProvider);

      // Then
      expect(totalQuantity, equals(8)); // 3 + 5
    });

    test('총 원가 계산 테스트', () async {
      // Given
      // 먼저 낚시대를 추가
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 10000.0,
        lengthPrices: {18: 9000.0, 20: 11000.0},
      );
      final fishingRods = container.read(fishingRodProvider);
      final rodId = fishingRods.first.id;

      // 계산 항목 추가
      final calculationNotifier = container.read(calculationProvider.notifier);
      calculationNotifier.addCalculationItem(
        fishingRodId: rodId,
        length: 18,
        quantity: 3,
        discountRate: 0.7,
      );
      calculationNotifier.addCalculationItem(
        fishingRodId: rodId,
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      final totalOriginalPrice = container.read(totalOriginalPriceProvider);

      // Then
      // 18칸 3대: 9000 * 3 = 27000
      // 20칸 5대: 11000 * 5 = 55000
      // 총합: 82000
      expect(totalOriginalPrice, equals(82000.0));
    });

    test('총 최종 가격 계산 테스트', () async {
      // Given
      // 먼저 낚시대를 추가
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 10000.0,
        lengthPrices: {18: 10000.0, 20: 10000.0},
      );
      final fishingRods = container.read(fishingRodProvider);
      final rodId = fishingRods.first.id;

      // 계산 항목 추가
      final calculationNotifier = container.read(calculationProvider.notifier);
      calculationNotifier.addCalculationItem(
        fishingRodId: rodId,
        length: 18,
        quantity: 2,
        discountRate: 0.7, // 70% 할인율
      );
      calculationNotifier.addCalculationItem(
        fishingRodId: rodId,
        length: 20,
        quantity: 3,
        discountRate: 0.6, // 60% 할인율
      );

      // When
      final totalFinalPrice = container.read(totalFinalPriceProvider);

      // Then
      // 18칸 2대: (10000 * 2) * 0.7 = 14000
      // 20칸 3대: (10000 * 3) * 0.6 = 18000
      // 총합: 32000
      expect(totalFinalPrice, equals(32000.0));
    });

    test('빈 계산 항목에서 총계 테스트', () {
      // When
      final totalQuantity = container.read(totalQuantityProvider);
      final totalOriginalPrice = container.read(totalOriginalPriceProvider);
      final totalFinalPrice = container.read(totalFinalPriceProvider);

      // Then
      expect(totalQuantity, equals(0));
      expect(totalOriginalPrice, equals(0.0));
      expect(totalFinalPrice, equals(0.0));
    });
  });
}
