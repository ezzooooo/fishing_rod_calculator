import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fishing_rod_calculator/screens/home_screen.dart';
import 'package:fishing_rod_calculator/providers/brand_provider.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';

void main() {
  group('HomeScreen Widget Tests', () {
    late ProviderContainer container;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    Widget createHomeScreen() {
      return UncontrolledProviderScope(
        container: container,
        child: MaterialApp(home: const HomeScreen()),
      );
    }

    testWidgets('HomeScreen 초기 렌더링 테스트', (WidgetTester tester) async {
      // When
      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // Then
      expect(find.text('낚시대 계산기'), findsOneWidget);
      // 빈 상태에서는 등록된 낚시대가 없다는 메시지가 표시됨
      expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
      expect(find.text('먼저 브랜드와 낚시대를 등록해주세요'), findsOneWidget);
      // 빈 상태에서는 검색 필드와 드롭다운이 표시되지 않음
      expect(find.byType(TextField), findsNothing);
      expect(find.byType(DropdownButtonFormField<FishingRod>), findsNothing);
    });

    testWidgets('검색 기능 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );
      await fishingRodNotifier.addFishingRod(
        name: '체어맨 블루',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 60,
        usedPrice: 50000.0,
        lengthPrices: const {},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // When - 검색어 입력
      final searchField = find.widgetWithText(TextField, '낚시대 또는 브랜드명으로 검색');
      await tester.enterText(searchField, '독야');
      await tester.pumpAndSettle();

      // Then - 드롭다운에 필터된 결과만 표시되어야 함
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();

      expect(find.text('[송원] 독야1'), findsOneWidget);
      expect(find.text('[송원] 체어맨 블루'), findsNothing);
    });

    testWidgets('낚시대 선택 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 22,
        usedPrice: 50000.0,
        lengthPrices: {18: 45000.0, 20: 48000.0, 22: 50000.0},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // When - 낚시대 선택
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야1'));
      await tester.pumpAndSettle();

      // Then - 칸수 목록이 표시되어야 함
      expect(find.text('18칸'), findsOneWidget);
      expect(find.text('20칸'), findsOneWidget);
      expect(find.text('22칸'), findsOneWidget);
    });

    testWidgets('수량 입력 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 20,
        usedPrice: 50000.0,
        lengthPrices: {18: 45000.0, 20: 48000.0},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // 낚시대 선택
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야1'));
      await tester.pumpAndSettle();

      // When - 18칸 수량 입력
      final quantityFields = find.byType(TextFormField);
      await tester.enterText(quantityFields.at(0), '5');
      await tester.pumpAndSettle();

      // Then - 계산 결과가 표시되어야 함 (총합 영역에서 확인)
      expect(find.text('5대'), findsOneWidget);
      expect(
        find.text('225000원'),
        findsAtLeastNWidgets(1),
      ); // 개별 계산과 총합에서 모두 나타날 수 있음
    });

    testWidgets('할인율 변경 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 18,
        usedPrice: 50000.0,
        lengthPrices: {18: 10000.0},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // 낚시대 선택 및 수량 입력
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야1'));
      await tester.pumpAndSettle();

      final quantityFields = find.byType(TextFormField);
      await tester.enterText(quantityFields.at(0), '2');
      await tester.pumpAndSettle();

      // When - 할인율 변경 (70% → 60%)
      await tester.tap(find.byType(DropdownButton<double>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('60%'));
      await tester.pumpAndSettle();

      // Then - 변경된 할인율로 계산되어야 함
      expect(find.text('12000원'), findsAtLeastNWidgets(1)); // (10000 * 2) * 0.6
    });

    testWidgets('계산 초기화 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 18,
        usedPrice: 50000.0,
        lengthPrices: {18: 10000.0},
      );
      await fishingRodNotifier.addFishingRod(
        name: '독야2',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 18,
        usedPrice: 50000.0,
        lengthPrices: {18: 10000.0},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // 첫 번째 낚시대 선택 및 수량 입력
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야1'));
      await tester.pumpAndSettle();

      final quantityFields = find.byType(TextFormField);
      await tester.enterText(quantityFields.at(0), '5');
      await tester.pumpAndSettle();

      // 계산 결과 확인
      expect(find.text('5대'), findsOneWidget);

      // When - 다른 낚시대로 변경
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야2'));
      await tester.pumpAndSettle();

      // Then - 계산 결과가 초기화되어야 함 (총합 표시가 없어야 함)
      expect(find.text('0대'), findsNothing);
      expect(find.text('0원'), findsNothing);
    });

    testWidgets('검색 시 선택된 낚시대 자동 해제 테스트', (WidgetTester tester) async {
      // Given - 테스트 데이터 설정
      final brandNotifier = container.read(brandProvider.notifier);
      final fishingRodNotifier = container.read(fishingRodProvider.notifier);

      await brandNotifier.addBrandWithId('brand_001', '송원');
      await fishingRodNotifier.addFishingRod(
        name: '독야1',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 18,
        usedPrice: 50000.0,
        lengthPrices: {18: 10000.0},
      );
      await fishingRodNotifier.addFishingRod(
        name: '체어맨 블루',
        brandId: 'brand_001',
        minValue: 18,
        maxValue: 18,
        usedPrice: 50000.0,
        lengthPrices: {18: 10000.0},
      );

      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // 낚시대 선택
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('[송원] 독야1'));
      await tester.pumpAndSettle();

      // When - 선택된 낚시대를 제외하는 검색어 입력
      final searchField = find.widgetWithText(TextField, '낚시대 또는 브랜드명으로 검색');
      await tester.enterText(searchField, '체어맨');
      await tester.pumpAndSettle();

      // Then - 선택이 해제되어야 함 (드롭다운이 초기 상태로 돌아감)
      // 드롭다운에서 선택된 항목이 없어야 함
      await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
      await tester.pumpAndSettle();

      // 필터링된 결과에 체어맨만 보여야 함
      expect(find.text('[송원] 체어맨 블루'), findsOneWidget);
      expect(find.text('[송원] 독야1'), findsNothing);
    });

    testWidgets('빈 상태 메시지 표시 테스트', (WidgetTester tester) async {
      // When
      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // Then
      expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
      expect(find.text('먼저 브랜드와 낚시대를 등록해주세요'), findsOneWidget);
    });

    testWidgets('Drawer 메뉴 표시 테스트', (WidgetTester tester) async {
      // When
      await tester.pumpWidget(createHomeScreen());
      await tester.pumpAndSettle();

      // Then - Scaffold의 drawer가 설정되어 있는지 확인
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.drawer, isNotNull);

      // Drawer 열기
      await tester.tap(find.byIcon(Icons.menu));
      await tester.pumpAndSettle();

      expect(find.text('낚시대 계산기'), findsWidgets);
      expect(find.text('홈 (계산기)'), findsOneWidget);
      expect(find.text('브랜드 관리'), findsOneWidget);
      expect(find.text('낚시대 관리'), findsOneWidget);
    });
  });
}
