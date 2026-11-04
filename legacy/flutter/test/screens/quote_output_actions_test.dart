import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/widgets/quote_output_actions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  QuoteRecord quote() => QuoteRecord(
    id: 'quote',
    title: '홍길동님 판매 견적',
    customerName: '홍길동',
    note: '다음 주 방문',
    createdBy: 'staff',
    createdAt: DateTime(2026, 11, 4, 15),
    mode: CalculationMode.sale,
    items: const [
      QuoteItem(
        fishingRodId: 'rod1',
        fishingRodName: '독야1',
        brandName: '송원',
        length: 32,
        quantity: 2,
        unitPrice: 100000,
        rate: .7,
        finalUnitPrice: 70000,
      ),
      QuoteItem(
        fishingRodId: 'rod2',
        fishingRodName: '체어맨 블루',
        brandName: 'DIF',
        length: 28,
        quantity: 3,
        unitPrice: 95000,
        rate: .8,
        finalUnitPrice: 76000,
      ),
    ],
  );

  test('견적 복사문에 모든 낚시대와 고객, 품목별 금액과 합계를 담는다', () {
    final text = formatQuoteText(quote());
    expect(text, contains('고객: 홍길동'));
    expect(text, contains('[송원] 독야1'));
    expect(text, contains('32칸 · 2대 · 단가 70,000원 · 합계 140,000원'));
    expect(text, contains('[DIF] 체어맨 블루'));
    expect(text, contains('28칸 · 3대 · 단가 76,000원 · 합계 228,000원'));
    expect(text, contains('총 5대'));
    expect(text, contains('총 견적 금액: 368,000원'));
    expect(text, contains('메모: 다음 주 방문'));
  });

  testWidgets('전체 견적을 클립보드에 복사한다', (tester) async {
    String? clipboard;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          clipboard = (call.arguments as Map)['text'] as String;
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: QuoteOutputActions(record: quote())),
      ),
    );
    await tester.tap(find.text('견적 복사'));
    await tester.pumpAndSettle();
    expect(clipboard, formatQuoteText(quote()));
    expect(find.text('전체 견적을 복사했습니다.'), findsOneWidget);
  });

  testWidgets('휴대폰 미리보기에 여러 낚시대와 총액을 표시한다', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: QuoteOutputActions(record: quote())),
      ),
    );
    await tester.tap(find.text('견적서 미리보기'));
    await tester.pumpAndSettle();
    expect(find.text('[송원] 독야1'), findsOneWidget);
    expect(find.text('[DIF] 체어맨 블루'), findsOneWidget);
    expect(find.text('총 5대 · 368,000원'), findsOneWidget);
    expect(find.text('인쇄'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('닫기'));
    await tester.pumpAndSettle();
    expect(find.text('[송원] 독야1'), findsNothing);
  });
}
