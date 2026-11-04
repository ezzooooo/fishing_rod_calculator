import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/providers/brand_provider.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_draft_provider.dart';
import 'package:fishing_rod_calculator/screens/home_screen.dart';
import 'package:fishing_rod_calculator/widgets/app_text_fields.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/firebase_test_environment.dart';

void main() {
  late ProviderContainer container;
  setUp(() => container = createTestContainer());
  tearDown(() => container.dispose());

  Future<void> seed() async {
    await container.read(brandProvider.notifier).addBrandWithId('brand', '송원');
    for (final entry in [
      ('rod1', '독야1', 10000.0),
      ('rod2', '체어맨 블루', 20000.0),
    ]) {
      await container
          .read(fishingRodProvider.notifier)
          .addFishingRodWithId(
            id: entry.$1,
            name: entry.$2,
            brandId: 'brand',
            minValue: 18,
            maxValue: 20,
            usedPrice: entry.$3,
            purchaseLengthPrices: {18: entry.$3, 20: entry.$3 + 2000},
            saleLengthPrices: {18: entry.$3 * 2, 20: entry.$3 * 2 + 2000},
          );
    }
  }

  Future<void> openHome(WidgetTester tester, {bool mobile = false}) async {
    tester.view.physicalSize = mobile
        ? const Size(390, 844)
        : const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: HomeScreen()),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openPicker(WidgetTester tester) async {
    await tester.ensureVisible(find.text('낚시대 추가').first);
    await tester.tap(find.text('낚시대 추가').first);
    await tester.pumpAndSettle();
  }

  Future<void> selectRod(WidgetTester tester, String name) async {
    await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('[송원] $name').last);
    await tester.pumpAndSettle();
  }

  Future<void> addRod(WidgetTester tester, String name, int quantity) async {
    await openPicker(tester);
    await selectRod(tester, name);
    await tester.enterText(
      find.byKey(const ValueKey('quote-quantity-18')),
      '$quantity',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('견적에 담기'));
    await tester.pumpAndSettle();
  }

  Finder field(String label) => find.byWidgetPredicate(
    (widget) =>
        widget is AppTextFormField && widget.decoration?.labelText == label,
  );

  testWidgets('새 견적에 고객 정보와 빈 견적 안내를 표시한다', (tester) async {
    await openHome(tester);
    expect(find.text('새 견적 만들기'), findsOneWidget);
    expect(field('고객명 (선택)'), findsOneWidget);
    expect(field('메모 (선택)'), findsOneWidget);
    expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
    expect(container.read(quoteDraftProvider).items, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('낚시대 추가 창에서 이름으로 검색한다', (tester) async {
    await seed();
    await openHome(tester);
    await openPicker(tester);
    await tester.enterText(find.byType(AppTextField), '독야');
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
    await tester.pumpAndSettle();
    expect(find.text('[송원] 독야1'), findsOneWidget);
    expect(find.text('[송원] 체어맨 블루'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('같은 칸수인 서로 다른 낚시대의 수량을 따로 담고 합산한다', (tester) async {
    await seed();
    await openHome(tester);
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 2);
    expect(draft.totalQuantity, 5);
    expect(draft.totalPrice, 56000);
    expect(draft.rods.first.calculations.single.quantity, 2);
    expect(draft.rods.last.calculations.single.quantity, 3);
    expect(find.textContaining('56,000'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('낚시대 추가를 취소하면 작성 중인 견적을 바꾸지 않는다', (tester) async {
    await seed();
    await openHome(tester);
    await addRod(tester, '독야1', 2);
    await openPicker(tester);
    await selectRod(tester, '체어맨 블루');
    await tester.enterText(
      find.byKey(const ValueKey('quote-quantity-18')),
      '5',
    );
    await tester.tap(find.byTooltip('닫기'));
    await tester.pumpAndSettle();
    expect(container.read(quoteDraftProvider).rodCount, 1);
    expect(container.read(quoteDraftProvider).totalQuantity, 2);
    expect(container.read(quoteDraftProvider).totalPrice, 14000);
  });

  testWidgets('담은 낚시대를 다시 수정해도 다른 종류의 입력은 유지한다', (tester) async {
    await seed();
    await openHome(tester);
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    await tester.tap(find.byTooltip('낚시대 수정').first);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('quote-quantity-18')),
      '4',
    );
    await tester.tap(find.text('변경 반영'));
    await tester.pumpAndSettle();
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 2);
    expect(draft.rods.first.calculations.single.quantity, 4);
    expect(draft.rods.last.calculations.single.quantity, 3);
    expect(draft.totalPrice, 70000);
  });

  testWidgets('한 종류를 빼도 다른 낚시대와 고객 정보를 유지한다', (tester) async {
    await seed();
    await openHome(tester);
    await tester.enterText(field('고객명 (선택)'), '김민수');
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    await tester.tap(find.byTooltip('낚시대 빼기').first);
    await tester.pumpAndSettle();
    final draft = container.read(quoteDraftProvider);
    expect(draft.rodCount, 1);
    expect(draft.rods.single.rod.name, '체어맨 블루');
    expect(draft.totalQuantity, 3);
    expect(draft.totalPrice, 42000);
    expect(draft.customerName, '김민수');
  });

  testWidgets('판매로 바꾸면 담은 모든 종류의 판매 금액을 합산한다', (tester) async {
    await seed();
    await openHome(tester);
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    await tester.tap(find.widgetWithText(ChoiceChip, '판매'));
    await tester.pumpAndSettle();
    final draft = container.read(quoteDraftProvider);
    expect(draft.mode, CalculationMode.sale);
    expect(draft.rodCount, 2);
    expect(draft.totalPrice, 112000);
    expect(draft.totalQuantity, 5);
  });

  testWidgets('휴대폰에서 고객 정보와 여러 낚시대, 저장 버튼이 넘치지 않는다', (tester) async {
    await seed();
    await openHome(tester, mobile: true);
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    expect(container.read(quoteDraftProvider).rodCount, 2);
    expect(find.text('견적 저장'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('새로 작성은 확인 후 고객과 담은 낚시대를 함께 비운다', (tester) async {
    await seed();
    await openHome(tester);
    await tester.enterText(field('고객명 (선택)'), '김민수');
    await tester.enterText(field('메모 (선택)'), '다음 주 방문');
    await addRod(tester, '독야1', 2);
    await tester.tap(find.byTooltip('새로 작성'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('계속 작성'));
    await tester.pumpAndSettle();
    expect(container.read(quoteDraftProvider).rodCount, 1);
    await tester.tap(find.byTooltip('새로 작성'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '새로 작성'));
    await tester.pumpAndSettle();
    expect(container.read(quoteDraftProvider).hasContent, isFalse);
    expect(
      tester.widget<AppTextFormField>(field('고객명 (선택)')).controller!.text,
      isEmpty,
    );
    expect(
      tester
          .widget<FilledButton>(find.byKey(const ValueKey('save-quote')))
          .onPressed,
      isNull,
    );
  });

  testWidgets('메뉴에 새 견적과 내역 및 관리 화면을 표시한다', (tester) async {
    await openHome(tester);
    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();
    expect(
      find.descendant(of: find.byType(Drawer), matching: find.text('새 견적 만들기')),
      findsOneWidget,
    );
    expect(find.text('견적 내역'), findsOneWidget);
    expect(find.text('브랜드 관리'), findsOneWidget);
    expect(find.text('낚시대 관리'), findsOneWidget);
    expect(find.text('시스템 설정'), findsNothing);
  });
}
