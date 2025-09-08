import 'package:flutter_test/flutter_test.dart';
import 'package:fishing_rod_calculator/models/calculation_item.dart';

void main() {
  group('CalculationItem Model Tests', () {
    test('CalculationItem 생성 테스트', () {
      // Given
      const fishingRodId = 'rod_001';
      const length = 20;
      const quantity = 5;
      const discountRate = 0.7;

      // When
      const item = CalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: quantity,
        discountRate: discountRate,
      );

      // Then
      expect(item.fishingRodId, equals(fishingRodId));
      expect(item.length, equals(length));
      expect(item.quantity, equals(quantity));
      expect(item.discountRate, equals(discountRate));
    });

    test('CalculationItem getTotalPrice 테스트', () {
      // Given
      const item = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );
      const usedPrice = 10000.0;

      // When
      final totalPrice = item.getTotalPrice(usedPrice);

      // Then
      expect(totalPrice, equals(50000.0)); // 10000 * 5 = 50000
    });

    test('CalculationItem getFinalPrice 테스트', () {
      // Given
      const item = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7, // 70% 할인율
      );
      const usedPrice = 10000.0;

      // When
      final finalPrice = item.getFinalPrice(usedPrice);

      // Then
      expect(finalPrice, equals(35000.0)); // (10000 * 5) * 0.7 = 35000
    });

    test('CalculationItem 다양한 할인율 테스트', () {
      // Given
      const baseItem = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 2,
        discountRate: 0.5, // 50% 할인율
      );
      const usedPrice = 10000.0;

      // When
      final totalPrice = baseItem.getTotalPrice(usedPrice);
      final finalPrice = baseItem.getFinalPrice(usedPrice);

      // Then
      expect(totalPrice, equals(20000.0)); // 10000 * 2 = 20000
      expect(finalPrice, equals(10000.0)); // 20000 * 0.5 = 10000

      // 다른 할인율 테스트
      const item40 = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 2,
        discountRate: 0.4, // 40% 할인율
      );
      expect(
        item40.getFinalPrice(usedPrice),
        equals(8000.0),
      ); // 20000 * 0.4 = 8000

      const item70 = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 2,
        discountRate: 0.7, // 70% 할인율
      );
      expect(
        item70.getFinalPrice(usedPrice),
        equals(14000.0),
      ); // 20000 * 0.7 = 14000
    });

    test('CalculationItem JSON 직렬화 테스트', () {
      // Given
      const item = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // When
      final json = item.toJson();

      // Then
      expect(json['fishingRodId'], equals('rod_001'));
      expect(json['length'], equals(20));
      expect(json['quantity'], equals(5));
      expect(json['discountRate'], equals(0.7));
    });

    test('CalculationItem JSON 역직렬화 테스트', () {
      // Given
      final json = {
        'fishingRodId': 'rod_001',
        'length': 20,
        'quantity': 5,
        'discountRate': 0.7,
      };

      // When
      final item = CalculationItem.fromJson(json);

      // Then
      expect(item.fishingRodId, equals('rod_001'));
      expect(item.length, equals(20));
      expect(item.quantity, equals(5));
      expect(item.discountRate, equals(0.7));
    });

    test('CalculationItem copyWith 테스트', () {
      // Given
      const originalItem = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );
      const newQuantity = 10;
      const newDiscountRate = 0.6;

      // When
      final updatedItem = originalItem.copyWith(
        quantity: newQuantity,
        discountRate: newDiscountRate,
      );

      // Then
      expect(updatedItem.fishingRodId, equals(originalItem.fishingRodId));
      expect(updatedItem.length, equals(originalItem.length));
      expect(updatedItem.quantity, equals(newQuantity));
      expect(updatedItem.discountRate, equals(newDiscountRate));
    });

    test('CalculationItem 동등성 테스트', () {
      // Given
      const item1 = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );
      const item2 = CalculationItem(
        fishingRodId: 'rod_001',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );
      const item3 = CalculationItem(
        fishingRodId: 'rod_002',
        length: 20,
        quantity: 5,
        discountRate: 0.7,
      );

      // Then
      expect(item1, equals(item2));
      expect(item1.hashCode, equals(item2.hashCode));
      expect(item1, isNot(equals(item3)));
    });

    test('CalculationItem 경계값 테스트', () {
      // Given
      const item = CalculationItem(
        fishingRodId: 'rod_001',
        length: 18,
        quantity: 0, // 경계값: 수량 0
        discountRate: 0.4, // 경계값: 최소 할인율
      );
      const usedPrice = 10000.0;

      // When & Then
      expect(item.getTotalPrice(usedPrice), equals(0.0)); // 수량이 0이면 총가격도 0
      expect(item.getFinalPrice(usedPrice), equals(0.0)); // 수량이 0이면 최종가격도 0

      // 최대 할인율 테스트
      const maxDiscountItem = CalculationItem(
        fishingRodId: 'rod_001',
        length: 18,
        quantity: 1,
        discountRate: 0.7, // 경계값: 최대 할인율
      );
      expect(
        maxDiscountItem.getFinalPrice(usedPrice),
        equals(7000.0),
      ); // 10000 * 0.7
    });
  });
}
