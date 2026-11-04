import 'package:flutter_test/flutter_test.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';

void main() {
  group('FishingRod Model Tests', () {
    test('FishingRod 생성 테스트', () {
      // Given
      const id = 'rod_001';
      const name = '독야1';
      const brandId = 'brand_001';
      const minValue = 18;
      const maxValue = 60;
      const usedPrice = 50000.0;
      final lengthPrices = {18: 45000.0, 20: 48000.0, 22: 50000.0};
      final createdAt = DateTime.now();

      // When
      final rod = FishingRod(
        id: id,
        name: name,
        brandId: brandId,
        minValue: minValue,
        maxValue: maxValue,
        usedPrice: usedPrice,
        lengthPrices: lengthPrices,
        createdAt: createdAt,
      );

      // Then
      expect(rod.id, equals(id));
      expect(rod.name, equals(name));
      expect(rod.brandId, equals(brandId));
      expect(rod.minValue, equals(minValue));
      expect(rod.maxValue, equals(maxValue));
      expect(rod.usedPrice, equals(usedPrice));
      expect(rod.lengthPrices, equals(lengthPrices));
      expect(rod.createdAt, equals(createdAt));
      expect(rod.updatedAt, isNull);
    });

    test('FishingRod availableLengths 테스트 - lengthPrices 사용', () {
      // Given
      final rod = FishingRod(
        id: 'rod_001',
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: {22: 50000.0, 18: 45000.0, 20: 48000.0},
      );

      // When
      final availableLengths = rod.availableLengths;

      // Then
      expect(availableLengths, equals([18, 20, 22])); // 정렬된 순서
    });

    test('FishingRod availableLengths 테스트 - 기존 방식 (lengthPrices 비어있음)', () {
      // Given
      final rod = FishingRod(
        id: 'rod_001',
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 22,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      // When
      final availableLengths = rod.availableLengths;

      // Then
      expect(
        availableLengths,
        equals([18, 20, 22]),
      ); // minValue부터 maxValue까지 2씩 증가
    });

    test('FishingRod getPriceForLength 테스트', () {
      // Given
      final rod = FishingRod(
        id: 'rod_001',
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: {18: 45000.0, 20: 48000.0},
      );

      // When & Then
      expect(rod.getPriceForLength(18), equals(45000.0)); // lengthPrices에서 가져옴
      expect(rod.getPriceForLength(20), equals(48000.0)); // lengthPrices에서 가져옴
      expect(
        rod.getPriceForLength(22),
        equals(50000.0),
      ); // usedPrice 사용 (fallback)
    });

    test('FishingRod JSON 직렬화 테스트', () {
      // Given
      final rod = FishingRod(
        id: 'rod_001',
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {18: 45000.0, 20: 48000.0},
        createdAt: DateTime(2024, 1, 1),
        updatedAt: DateTime(2024, 1, 2),
      );

      // When
      final json = rod.toJson();

      // Then
      expect(json['id'], equals('rod_001'));
      expect(json['name'], equals('독야1'));
      expect(json['brandId'], equals('brand_001'));
      expect(json['minValue'], equals(18));
      expect(json['maxValue'], equals(60));
      expect(json['usedPrice'], equals(50000.0));
      expect(
        json['lengthPrices'],
        equals({'18': 45000.0, '20': 48000.0}),
      ); // JSON에서는 키가 문자열로 저장됨
      expect(json['createdAt'], equals('2024-01-01T00:00:00.000'));
      expect(json['updatedAt'], equals('2024-01-02T00:00:00.000'));
    });

    test('FishingRod JSON 역직렬화 테스트', () {
      // Given
      final json = {
        'id': 'rod_001',
        'name': '독야1',
        'brandId': 'brand_001',
        'minValue': 18,
        'maxValue': 60,
        'usedPrice': 50000.0,
        'lengthPrices': {'18': 45000.0, '20': 48000.0}, // JSON에서 키는 문자열
        'createdAt': '2024-01-01T00:00:00.000',
        'updatedAt': '2024-01-02T00:00:00.000',
      };

      // When
      final rod = FishingRod.fromJson(json);

      // Then
      expect(rod.id, equals('rod_001'));
      expect(rod.name, equals('독야1'));
      expect(rod.brandId, equals('brand_001'));
      expect(rod.minValue, equals(18));
      expect(rod.maxValue, equals(60));
      expect(rod.usedPrice, equals(50000.0));
      expect(rod.lengthPrices, equals({18: 45000.0, 20: 48000.0}));
      expect(rod.createdAt, equals(DateTime(2024, 1, 1)));
      expect(rod.updatedAt, equals(DateTime(2024, 1, 2)));
    });

    test('FishingRod copyWith 테스트', () {
      // Given
      final originalRod = FishingRod(
        id: 'rod_001',
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        createdAt: DateTime.now(),
      );
      const newName = '독야2';
      const newUsedPrice = 55000.0;
      final updatedAt = DateTime.now();

      // When
      final updatedRod = originalRod.copyWith(
        name: newName,
        usedPrice: newUsedPrice,
        updatedAt: updatedAt,
      );

      // Then
      expect(updatedRod.id, equals(originalRod.id));
      expect(updatedRod.name, equals(newName));
      expect(updatedRod.brandId, equals(originalRod.brandId));
      expect(updatedRod.usedPrice, equals(newUsedPrice));
      expect(updatedRod.updatedAt, equals(updatedAt));
    });
  });
}
