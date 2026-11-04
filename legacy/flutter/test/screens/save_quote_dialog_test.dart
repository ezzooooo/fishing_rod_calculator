import 'dart:async';

import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_provider.dart';
import 'package:fishing_rod_calculator/widgets/save_quote_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository extends Fake implements QuoteRepository {
  int calls = 0;
  String? title;
  String? note;
  String? customerName;
  CalculationMode? mode;
  List<QuoteItem>? items;
  bool fail = false;
  Completer<String>? pending;

  @override
  Future<String> create({
    required String title,
    required String note,
    required CalculationMode mode,
    required List<QuoteItem> items,
    String customerName = '',
  }) async {
    calls++;
    this.title = title;
    this.note = note;
    this.customerName = customerName;
    this.mode = mode;
    this.items = items;
    if (fail) throw StateError('offline');
    return pending == null ? 'saved-quote' : await pending!.future;
  }
}

void main() {
  final items = [
    QuoteItem.priced(
      fishingRodId: 'rod-1',
      fishingRodName: '독야',
      brandName: '송원',
      length: 32,
      quantity: 3,
      unitPrice: 15900,
      rate: 0.7,
      mode: CalculationMode.purchase,
    ),
  ];

  Future<void> openDialog(
    WidgetTester tester,
    _Repository repository, {
    ValueChanged<String?>? onResult,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [quoteRepositoryProvider.overrideWithValue(repository)],
        child: MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  final result = await showDialog<String>(
                    context: context,
                    barrierDismissible: false,
                    builder: (context) => SaveQuoteDialog(
                      items: items,
                      mode: CalculationMode.purchase,
                    ),
                  );
                  onResult?.call(result);
                },
                child: const Text('열기'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
  }

  testWidgets('saves title, memo and historical item prices', (tester) async {
    final repository = _Repository();
    String? result;
    await openDialog(tester, repository, onResult: (value) => result = value);
    expect(find.text('매입 · 3대 · 33,000원'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).first, '  김님 상담  ');
    await tester.enterText(find.byType(TextFormField).last, '  다음 주 방문  ');
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(result, 'saved-quote');
    expect(repository.calls, 1);
    expect(repository.title, '김님 상담');
    expect(repository.note, '다음 주 방문');
    expect(repository.mode, CalculationMode.purchase);
    expect(repository.items!.single.length, 32);
    expect(repository.items!.single.quantity, 3);
    expect(repository.items!.single.finalUnitPrice, 11000);
  });

  testWidgets('validates title and keeps draft after failure for retry', (
    tester,
  ) async {
    final repository = _Repository()..fail = true;
    await openDialog(tester, repository);
    await tester.enterText(find.byType(TextFormField).first, '   ');
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('견적 제목을 입력해주세요'), findsOneWidget);
    expect(repository.calls, 0);

    await tester.enterText(find.byType(TextFormField).first, '방문 상담');
    await tester.enterText(find.byType(TextFormField).last, '메모 유지');
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.textContaining('견적을 저장하지 못했습니다'), findsOneWidget);
    expect(find.text('메모 유지'), findsOneWidget);
    repository.fail = false;
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(repository.calls, 2);
    expect(repository.note, '메모 유지');
    expect(find.byType(SaveQuoteDialog), findsNothing);
  });

  testWidgets('blocks duplicate save while request is pending', (tester) async {
    final repository = _Repository()..pending = Completer<String>();
    await openDialog(tester, repository);
    await tester.tap(find.text('저장'));
    await tester.pump();
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, '취소'))
          .onPressed,
      isNull,
    );
    expect(repository.calls, 1);
    repository.pending!.complete('saved-quote');
    await tester.pumpAndSettle();
    expect(find.byType(SaveQuoteDialog), findsNothing);
  });

  testWidgets('cancel leaves repository untouched', (tester) async {
    final repository = _Repository();
    await openDialog(tester, repository);
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(repository.calls, 0);
    expect(find.byType(SaveQuoteDialog), findsNothing);
  });
}
