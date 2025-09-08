import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fishing_rod_calculator/providers/brand_provider.dart';

void main() {
  group('BrandProvider Tests', () {
    late ProviderContainer container;

    setUp(() {
      // SharedPreferences 목킹
      SharedPreferences.setMockInitialValues({});
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('초기 상태는 빈 리스트여야 함', () {
      // When
      final brands = container.read(brandProvider);

      // Then
      expect(brands, isEmpty);
    });

    test('브랜드 추가 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      const brandName = '송원';

      // When
      await notifier.addBrand(brandName);
      final brands = container.read(brandProvider);

      // Then
      expect(brands, hasLength(1));
      expect(brands.first.name, equals(brandName));
      expect(brands.first.id, isNotEmpty);
      expect(brands.first.createdAt, isNotNull);
      expect(brands.first.updatedAt, isNull);
    });

    test('고정 ID로 브랜드 추가 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      const brandId = 'brand_001';
      const brandName = '송원';

      // When
      await notifier.addBrandWithId(brandId, brandName);
      final brands = container.read(brandProvider);

      // Then
      expect(brands, hasLength(1));
      expect(brands.first.id, equals(brandId));
      expect(brands.first.name, equals(brandName));
      expect(brands.first.createdAt, isNotNull);
      expect(brands.first.updatedAt, isNull);
    });

    test('여러 브랜드 추가 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      const brandNames = ['송원', 'DIF', 'BJ 비제이'];

      // When
      for (final name in brandNames) {
        await notifier.addBrand(name);
      }
      final brands = container.read(brandProvider);

      // Then
      expect(brands, hasLength(3));
      expect(brands.map((b) => b.name).toList(), equals(brandNames));
    });

    test('브랜드 수정 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      final brands = container.read(brandProvider);
      final brandId = brands.first.id;
      const newName = 'DIF';

      // When
      await notifier.updateBrand(brandId, newName);
      final updatedBrands = container.read(brandProvider);

      // Then
      expect(updatedBrands, hasLength(1));
      expect(updatedBrands.first.id, equals(brandId));
      expect(updatedBrands.first.name, equals(newName));
      expect(updatedBrands.first.updatedAt, isNotNull);
    });

    test('존재하지 않는 브랜드 수정 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      const nonExistentId = 'non_existent_id';
      const newName = 'DIF';

      // When
      await notifier.updateBrand(nonExistentId, newName);
      final brands = container.read(brandProvider);

      // Then
      expect(brands, hasLength(1));
      expect(brands.first.name, equals('송원')); // 원래 이름 유지
    });

    test('브랜드 삭제 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      await notifier.addBrand('DIF');
      final brands = container.read(brandProvider);
      final brandIdToDelete = brands.first.id;

      // When
      await notifier.deleteBrand(brandIdToDelete);
      final remainingBrands = container.read(brandProvider);

      // Then
      expect(remainingBrands, hasLength(1));
      expect(remainingBrands.first.name, equals('DIF'));
      expect(remainingBrands.any((b) => b.id == brandIdToDelete), isFalse);
    });

    test('존재하지 않는 브랜드 삭제 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      const nonExistentId = 'non_existent_id';

      // When
      await notifier.deleteBrand(nonExistentId);
      final brands = container.read(brandProvider);

      // Then
      expect(brands, hasLength(1));
      expect(brands.first.name, equals('송원'));
    });

    test('ID로 브랜드 조회 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      await notifier.addBrand('DIF');
      final brands = container.read(brandProvider);
      final targetBrand = brands.first;

      // When
      final foundBrand = notifier.getBrandById(targetBrand.id);

      // Then
      expect(foundBrand, isNotNull);
      expect(foundBrand!.id, equals(targetBrand.id));
      expect(foundBrand.name, equals(targetBrand.name));
    });

    test('존재하지 않는 ID로 브랜드 조회 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      await notifier.addBrand('송원');
      const nonExistentId = 'non_existent_id';

      // When
      final foundBrand = notifier.getBrandById(nonExistentId);

      // Then
      expect(foundBrand, isNull);
    });

    test('브랜드 상태 변경 감지 테스트', () async {
      // Given
      final notifier = container.read(brandProvider.notifier);
      final initialBrands = container.read(brandProvider);
      expect(initialBrands, isEmpty);

      // When
      await notifier.addBrand('송원');

      // Then
      final updatedBrands = container.read(brandProvider);
      expect(updatedBrands, hasLength(1));
      expect(updatedBrands.first.name, equals('송원'));
    });

    // SharedPreferences 지속성 테스트는 통합 테스트에서 더 적절함
    // test('브랜드 데이터 지속성 테스트 (SharedPreferences)', () async { ... });
  });
}
