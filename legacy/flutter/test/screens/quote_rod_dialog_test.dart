import 'package:fishing_rod_calculator/models/brand.dart';
import 'package:fishing_rod_calculator/models/calculation_item.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/models/quote_draft.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/widgets/quote_rod_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const brand = Brand(id: 'brand', name: '송원');
  const firstRod = FishingRod(
    id: 'rod-1',
    name: '독야1',
    brandId: 'brand',
    minValue: 18,
    maxValue: 20,
    usedPrice: 0,
    purchaseLengthPrices: {18: 15900, 20: 22600},
    saleLengthPrices: {18: 19800, 20: 30400},
  );
  const secondRod = FishingRod(
    id: 'rod-2',
    name: '체어맨 블루',
    brandId: 'brand',
    minValue: 18,
    maxValue: 18,
    usedPrice: 20000,
    purchaseLengthPrices: {18: 20000},
    saleLengthPrices: {18: 30000},
  );

  Finder quantityField(int length) => find.descendant(
    of: find.byKey(ValueKey('quote-quantity-$length')),
    matching: find.byType(TextFormField),
  );

  Future<void> openDialog(
    WidgetTester tester, {
    CalculationMode mode = CalculationMode.purchase,
    List<FishingRod> rods = const [firstRod, secondRod],
    List<QuoteDraftRod> existingGroups = const [],
    QuoteDraftRod? initialGroup,
    ValueChanged<QuoteDraftRod?>? onResult,
    bool mobile = false,
  }) async {
    tester.view.physicalSize = mobile
        ? const Size(390, 844)
        : const Size(1100, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          textTheme: const TextTheme(
            bodyLarge: TextStyle(fontSize: 19),
            bodyMedium: TextStyle(fontSize: 17),
            titleMedium: TextStyle(fontSize: 19),
            titleLarge: TextStyle(fontSize: 26),
            labelLarge: TextStyle(fontSize: 17),
          ),
        ),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                final result = await showDialog<QuoteDraftRod>(
                  context: context,
                  builder: (context) => QuoteRodDialog(
                    mode: mode,
                    rods: rods,
                    brands: const [brand],
                    existingGroups: existingGroups,
                    initialGroup: initialGroup,
                  ),
                );
                onResult?.call(result);
              },
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
  }

  Future<void> selectRod(WidgetTester tester, String name) async {
    await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('[송원] $name').last);
    await tester.pumpAndSettle();
  }

  testWidgets('낚시대와 수량을 선택한 뒤 담기를 눌러야 견적 항목을 반환한다', (tester) async {
    QuoteDraftRod? returned;
    await openDialog(tester, onResult: (result) => returned = result);
    await selectRod(tester, '독야1');
    await tester.enterText(quantityField(18), '2');
    await tester.pumpAndSettle();
    expect(returned, isNull);
    expect(find.text('총 2대'), findsOneWidget);
    expect(find.text('22,000원'), findsOneWidget);
    await tester.tap(find.text('견적에 담기'));
    await tester.pumpAndSettle();
    expect(returned?.rod.id, firstRod.id);
    expect(returned?.brandName, '송원');
    expect(returned?.calculations, hasLength(1));
    expect(returned?.calculations.single.quantity, 2);
    expect(returned?.calculations.single.discountRate, 0.7);
    expect(returned?.calculations.single.saleRate, 0.7);
  });

  testWidgets('다른 낚시대를 선택하면 이전 낚시대의 수량을 복사하지 않는다', (tester) async {
    QuoteDraftRod? returned;
    await openDialog(tester, onResult: (result) => returned = result);
    await selectRod(tester, '독야1');
    await tester.enterText(quantityField(18), '4');
    await tester.pumpAndSettle();
    await selectRod(tester, '체어맨 블루');
    expect(
      tester.widget<TextFormField>(quantityField(18)).controller!.text,
      '0',
    );
    expect(find.text('총 0대'), findsOneWidget);
    await tester.enterText(quantityField(18), '1');
    await tester.tap(find.text('견적에 담기'));
    await tester.pumpAndSettle();
    expect(returned?.rod.id, secondRod.id);
    expect(returned?.calculations.single.quantity, 1);
  });

  testWidgets('이미 담은 종류는 기존 수량을 복원하고 현재 모드의 적용율만 바꾼다', (tester) async {
    final original = QuoteDraftRod(
      rod: firstRod,
      brandName: '기록한 브랜드',
      calculations: const [
        CalculationItem(
          fishingRodId: 'rod-1',
          length: 18,
          quantity: 3,
          discountRate: 0.6,
          saleRate: 0.85,
        ),
      ],
    );
    QuoteDraftRod? returned;
    await openDialog(
      tester,
      mode: CalculationMode.sale,
      existingGroups: [original],
      initialGroup: original,
      rods: [
        firstRod.copyWith(saleLengthPrices: const {18: 999999}),
        secondRod,
      ],
      onResult: (result) => returned = result,
    );
    expect(
      tester.widget<TextFormField>(quantityField(18)).controller!.text,
      '3',
    );
    expect(find.text('판매가 19,800원'), findsOneWidget);
    expect(find.text('51,000원'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('quote-rate-18')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('90%').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('변경 반영'));
    await tester.pumpAndSettle();
    expect(returned?.rod, original.rod);
    expect(returned?.brandName, '기록한 브랜드');
    expect(returned?.calculations.single.discountRate, 0.6);
    expect(returned?.calculations.single.saleRate, 0.9);
    expect(original.calculations.single.saleRate, 0.85);
  });

  testWidgets('카탈로그에서 삭제된 종류도 담았던 가격으로 수정할 수 있다', (tester) async {
    final original = QuoteDraftRod(
      rod: secondRod,
      brandName: '송원',
      calculations: const [
        CalculationItem(
          fishingRodId: 'rod-2',
          length: 18,
          quantity: 2,
          discountRate: 0.7,
        ),
      ],
    );
    QuoteDraftRod? returned;
    await openDialog(
      tester,
      rods: const [],
      existingGroups: [original],
      initialGroup: original,
      onResult: (result) => returned = result,
    );
    expect(find.text('[송원] 체어맨 블루'), findsOneWidget);
    await tester.enterText(quantityField(18), '3');
    await tester.tap(find.text('변경 반영'));
    await tester.pumpAndSettle();
    expect(returned?.rod, secondRod);
    expect(
      returned?.itemsForMode(CalculationMode.purchase).single.totalPrice,
      42000,
    );
  });

  testWidgets('수량이 모두 0이면 담지 않고 입력 안내를 표시한다', (tester) async {
    QuoteDraftRod? returned;
    await openDialog(tester, onResult: (result) => returned = result);
    await selectRod(tester, '독야1');
    await tester.tap(find.text('견적에 담기'));
    await tester.pumpAndSettle();
    expect(find.text('수량을 한 대 이상 입력해주세요.'), findsOneWidget);
    expect(find.byType(QuoteRodDialog), findsOneWidget);
    expect(returned, isNull);
  });

  testWidgets('검색과 취소는 기존 견적 항목을 바꾸지 않는다', (tester) async {
    final original = QuoteDraftRod(
      rod: secondRod,
      brandName: '송원',
      calculations: const [
        CalculationItem(
          fishingRodId: 'rod-2',
          length: 18,
          quantity: 2,
          discountRate: 0.7,
        ),
      ],
    );
    QuoteDraftRod? returned;
    await openDialog(
      tester,
      existingGroups: [original],
      initialGroup: original,
      onResult: (result) => returned = result,
    );
    await tester.enterText(quantityField(18), '7');
    await tester.enterText(
      find.widgetWithText(TextField, '낚시대명 또는 브랜드명으로 검색'),
      '독야',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('닫기'));
    await tester.pumpAndSettle();
    expect(returned, isNull);
    expect(original.calculations.single.quantity, 2);
  });

  testWidgets('휴대폰과 키보드가 열린 화면에서도 입력과 담기 버튼을 표시한다', (tester) async {
    await openDialog(tester, mobile: true);
    await selectRod(tester, '독야1');
    expect(tester.takeException(), isNull);
    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    await tester.ensureVisible(quantityField(18));
    await tester.enterText(quantityField(18), '2');
    await tester.pumpAndSettle();
    expect(find.text('견적에 담기'), findsOneWidget);
    expect(find.text('총 2대'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
