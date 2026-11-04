import 'package:flutter_test/flutter_test.dart';
import 'package:fishing_rod_calculator/models/brand.dart';

void main() {
  group('Brand Model Tests', () {
    test('Brand 생성 테스트', () {
      // Given
      const id = 'brand_001';
      const name = '송원';
      final createdAt = DateTime.now();

      // When
      final brand = Brand(id: id, name: name, createdAt: createdAt);

      // Then
      expect(brand.id, equals(id));
      expect(brand.name, equals(name));
      expect(brand.createdAt, equals(createdAt));
      expect(brand.updatedAt, isNull);
    });

    test('Brand copyWith 테스트', () {
      // Given
      final originalBrand = Brand(
        id: 'brand_001',
        name: '송원',
        createdAt: DateTime.now(),
      );
      const newName = 'DIF';
      final updatedAt = DateTime.now();

      // When
      final updatedBrand = originalBrand.copyWith(
        name: newName,
        updatedAt: updatedAt,
      );

      // Then
      expect(updatedBrand.id, equals(originalBrand.id));
      expect(updatedBrand.name, equals(newName));
      expect(updatedBrand.createdAt, equals(originalBrand.createdAt));
      expect(updatedBrand.updatedAt, equals(updatedAt));
    });

    test('Brand JSON 직렬화 테스트', () {
      // Given
      final brand = Brand(
        id: 'brand_001',
        name: '송원',
        createdAt: DateTime(2024, 1, 1),
        updatedAt: DateTime(2024, 1, 2),
      );

      // When
      final json = brand.toJson();

      // Then
      expect(json['id'], equals('brand_001'));
      expect(json['name'], equals('송원'));
      expect(json['createdAt'], equals('2024-01-01T00:00:00.000'));
      expect(json['updatedAt'], equals('2024-01-02T00:00:00.000'));
    });

    test('Brand JSON 역직렬화 테스트', () {
      // Given
      final json = {
        'id': 'brand_001',
        'name': '송원',
        'createdAt': '2024-01-01T00:00:00.000',
        'updatedAt': '2024-01-02T00:00:00.000',
      };

      // When
      final brand = Brand.fromJson(json);

      // Then
      expect(brand.id, equals('brand_001'));
      expect(brand.name, equals('송원'));
      expect(brand.createdAt, equals(DateTime(2024, 1, 1)));
      expect(brand.updatedAt, equals(DateTime(2024, 1, 2)));
    });

    test('Brand 동등성 테스트', () {
      // Given
      final brand1 = Brand(
        id: 'brand_001',
        name: '송원',
        createdAt: DateTime(2024, 1, 1),
      );
      final brand2 = Brand(
        id: 'brand_001',
        name: '송원',
        createdAt: DateTime(2024, 1, 1),
      );
      final brand3 = Brand(
        id: 'brand_002',
        name: 'DIF',
        createdAt: DateTime(2024, 1, 1),
      );

      // Then
      expect(brand1, equals(brand2));
      expect(brand1.hashCode, equals(brand2.hashCode));
      expect(brand1, isNot(equals(brand3)));
    });
  });
}
