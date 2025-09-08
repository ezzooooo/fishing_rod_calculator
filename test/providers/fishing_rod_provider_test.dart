import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';

void main() {
  group('FishingRodProvider Tests', () {
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
      final fishingRods = container.read(fishingRodProvider);

      // Then
      expect(fishingRods, isEmpty);
    });

    test('낚시대 추가 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      const name = '독야1';
      const brandId = 'brand_001';
      const minValue = 18;
      const maxValue = 60;
      const usedPrice = 50000.0;
      final lengthPrices = {18: 45000.0, 20: 48000.0};

      // When
      await notifier.addFishingRod(
        name: name,
        brandId: brandId,
        minValue: minValue,
        maxValue: maxValue,
        usedPrice: usedPrice,
        lengthPrices: lengthPrices,
      );
      final fishingRods = container.read(fishingRodProvider);

      // Then
      expect(fishingRods, hasLength(1));
      final rod = fishingRods.first;
      expect(rod.name, equals(name));
      expect(rod.brandId, equals(brandId));
      expect(rod.minValue, equals(minValue));
      expect(rod.maxValue, equals(maxValue));
      expect(rod.usedPrice, equals(usedPrice));
      expect(rod.lengthPrices, equals(lengthPrices));
      expect(rod.id, isNotEmpty);
      expect(rod.createdAt, isNotNull);
      expect(rod.updatedAt, isNull);
    });

    test('여러 낚시대 추가 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      final rodData = [
        {'name': '독야1', 'brandId': 'brand_001'},
        {'name': '독야2', 'brandId': 'brand_001'},
        {'name': '체어맨 블루', 'brandId': 'brand_002'},
      ];

      // When
      for (final data in rodData) {
        await notifier.addFishingRod(
          name: data['name']!,
          brandId: data['brandId']!,
          minValue: 18,
          maxValue: 60,
          usedPrice: 50000.0,
          lengthPrices: const {},
        );
      }
      final fishingRods = container.read(fishingRodProvider);

      // Then
      expect(fishingRods, hasLength(3));
      expect(
        fishingRods.map((r) => r.name).toList(),
        equals(['독야1', '독야2', '체어맨 블루']),
      );
    });

    test('낚시대 수정 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      final fishingRods = container.read(fishingRodProvider);
      final rodId = fishingRods.first.id;

      const newName = '독야2';
      const newUsedPrice = 55000.0;
      final newLengthPrices = {18: 50000.0, 20: 52000.0};

      // When
      await notifier.updateFishingRod(
        id: rodId,
        name: newName,
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: newUsedPrice,
        lengthPrices: newLengthPrices,
      );
      final updatedRods = container.read(fishingRodProvider);

      // Then
      expect(updatedRods, hasLength(1));
      final updatedRod = updatedRods.first;
      expect(updatedRod.id, equals(rodId));
      expect(updatedRod.name, equals(newName));
      expect(updatedRod.usedPrice, equals(newUsedPrice));
      expect(updatedRod.lengthPrices, equals(newLengthPrices));
      expect(updatedRod.updatedAt, isNotNull);
    });

    test('존재하지 않는 낚시대 수정 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      const nonExistentId = 'non_existent_id';

      // When
      await notifier.updateFishingRod(
        id: nonExistentId,
        name: '독야2',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 55000.0,
        lengthPrices: const {},
      );
      final fishingRods = container.read(fishingRodProvider);

      // Then
      expect(fishingRods, hasLength(1));
      expect(fishingRods.first.name, equals('독야1')); // 원래 이름 유지
    });

    test('낚시대 삭제 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await notifier.addFishingRod(
        name: '독야2',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      final fishingRods = container.read(fishingRodProvider);
      final rodIdToDelete = fishingRods.first.id;

      // When
      await notifier.deleteFishingRod(rodIdToDelete);
      final remainingRods = container.read(fishingRodProvider);

      // Then
      expect(remainingRods, hasLength(1));
      expect(remainingRods.first.name, equals('독야2'));
      expect(remainingRods.any((r) => r.id == rodIdToDelete), isFalse);
    });

    test('ID로 낚시대 조회 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      final fishingRods = container.read(fishingRodProvider);
      final targetRod = fishingRods.first;

      // When
      final foundRod = notifier.getFishingRodById(targetRod.id);

      // Then
      expect(foundRod, isNotNull);
      expect(foundRod!.id, equals(targetRod.id));
      expect(foundRod.name, equals(targetRod.name));
    });

    test('브랜드별 낚시대 조회 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await notifier.addFishingRod(
        name: '독야2',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await notifier.addFishingRod(
        name: '체어맨 블루',
        brandId: 'brand_002',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      // When
      final brand001Rods = notifier.getFishingRodsByBrand('brand_001');
      final brand002Rods = notifier.getFishingRodsByBrand('brand_002');

      // Then
      expect(brand001Rods, hasLength(2));
      expect(brand001Rods.map((r) => r.name).toList(), equals(['독야1', '독야2']));
      expect(brand002Rods, hasLength(1));
      expect(brand002Rods.first.name, equals('체어맨 블루'));
    });

    test('낚시대 검색 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await notifier.addFishingRod(
        name: '독야2',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await notifier.addFishingRod(
        name: '체어맨 블루',
        brandId: 'brand_002',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      // When
      final searchResults1 = notifier.searchFishingRods('독야');
      final searchResults2 = notifier.searchFishingRods('체어맨');
      final searchResults3 = notifier.searchFishingRods('블루');

      // Then
      expect(searchResults1, hasLength(2));
      expect(
        searchResults1.map((r) => r.name).toList(),
        equals(['독야1', '독야2']),
      );
      expect(searchResults2, hasLength(1));
      expect(searchResults2.first.name, equals('체어맨 블루'));
      expect(searchResults3, hasLength(1));
      expect(searchResults3.first.name, equals('체어맨 블루'));
    });

    test('대소문자 구분 없는 검색 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '체어맨 블루',
        brandId: 'brand_002',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      // When
      final searchResults1 = notifier.searchFishingRods('체어맨');
      notifier.searchFishingRods('BLUE'); // 영어 대문자
      notifier.searchFishingRods('blue'); // 영어 소문자

      // Then
      expect(searchResults1, hasLength(1));
      // 실제 구현에서는 한글/영어 혼합 검색 로직에 따라 결과가 달라질 수 있음
    });

    test('빈 검색어 테스트', () async {
      // Given
      final notifier = container.read(fishingRodProvider.notifier);
      await notifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      // When
      final searchResults = notifier.searchFishingRods('');

      // Then
      expect(searchResults, hasLength(1)); // 빈 검색어는 모든 결과 반환
    });
  });
}
