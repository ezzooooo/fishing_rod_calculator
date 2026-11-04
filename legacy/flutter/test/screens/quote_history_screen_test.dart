import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/auth_provider.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_provider.dart';
import 'package:fishing_rod_calculator/screens/quote_detail_screen.dart';
import 'package:fishing_rod_calculator/screens/quote_history_screen.dart';
import 'package:fishing_rod_calculator/widgets/app_text_fields.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingRepository implements QuoteRepository {
  QuoteRecord? updated;

  @override
  Future<void> update(QuoteRecord record) async {
    updated = record;
  }

  @override
  Future<void> delete(String id) async {}

  @override
  Future<String> create({
    required String title,
    required String note,
    required CalculationMode mode,
    required List<QuoteItem> items,
    String customerName = '',
  }) async => 'new-quote';
}

void main() {
  final savedAt = DateTime(2026, 11, 4, 14, 35);
  final record = QuoteRecord(
    id: 'quote-1',
    title: '홍길동님 매입 상담',
    note: '금요일 방문 예정',
    createdBy: 'staff-1',
    mode: CalculationMode.purchase,
    createdAt: savedAt,
    revision: 4,
    items: const [
      QuoteItem(
        fishingRodId: 'deleted-rod',
        fishingRodName: '독야1',
        brandName: '송원',
        length: 32,
        quantity: 2,
        unitPrice: 100000,
        rate: 0.7,
        // Deliberately preserve the stored price rather than recalculate it.
        finalUnitPrice: 65000,
      ),
    ],
  );

  Finder field(String label) => find.byWidgetPredicate(
    (widget) =>
        widget is AppTextFormField && widget.decoration?.labelText == label,
  );

  Widget app(Widget home, {QuoteRepository? repository}) {
    return ProviderScope(
      overrides: [
        quoteRecordsProvider.overrideWith((ref) => Stream.value([record])),
        quoteRecordProvider(
          'quote-1',
        ).overrideWith((ref) => Stream.value(record)),
        canAccessSystemSettingsProvider.overrideWithValue(false),
        if (repository != null)
          quoteRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          textTheme: const TextTheme(
            bodyLarge: TextStyle(fontSize: 19),
            bodyMedium: TextStyle(fontSize: 17),
            titleMedium: TextStyle(fontSize: 19),
            titleLarge: TextStyle(fontSize: 26),
            headlineSmall: TextStyle(fontSize: 29),
            labelLarge: TextStyle(fontSize: 17),
          ),
        ),
        home: home,
      ),
    );
  }

  testWidgets('견적 내역에서 저장 정보와 검색 결과를 확인한다', (tester) async {
    await tester.pumpWidget(app(const QuoteHistoryScreen()));
    await tester.pumpAndSettle();

    expect(find.text('홍길동님 매입 상담'), findsOneWidget);
    expect(find.text('[송원] 독야1'), findsOneWidget);
    expect(find.text('1개 항목 · 총 2대'), findsOneWidget);
    expect(find.text('130,000원'), findsOneWidget);
    expect(find.text('기록 2026.11.04 14:35'), findsOneWidget);

    await tester.enterText(find.byType(AppTextField), '송원');
    await tester.pump();
    expect(find.text('홍길동님 매입 상담'), findsOneWidget);
    await tester.enterText(find.byType(AppTextField), '없는낚시대');
    await tester.pump();
    expect(find.text('검색 결과가 없습니다'), findsOneWidget);
  });

  testWidgets('카탈로그 없이도 저장된 단가와 금액을 그대로 표시한다', (tester) async {
    await tester.pumpWidget(app(const QuoteDetailScreen(quoteId: 'quote-1')));
    await tester.pumpAndSettle();

    expect(find.text('130,000원'), findsOneWidget);
    expect(find.text('최종 단가 65,000원'), findsOneWidget);
    expect(find.text('32칸 · 2대'), findsOneWidget);
    expect(find.text('기록 시간  2026.11.04 14:35:00'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('제목 수정은 당시 가격, 기록 시간과 수정 버전을 보존한다', (tester) async {
    final repository = _RecordingRepository();
    await tester.pumpWidget(
      app(const QuoteDetailScreen(quoteId: 'quote-1'), repository: repository),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('견적 수정'));
    await tester.pumpAndSettle();
    await tester.enterText(field('견적 제목'), '상담 완료');
    await tester.tap(find.text('수정 내용 저장'));
    await tester.pumpAndSettle();

    expect(repository.updated?.title, '상담 완료');
    expect(repository.updated?.createdAt, savedAt);
    expect(repository.updated?.revision, 4);
    expect(repository.updated?.totalPrice, 130000);
    expect(repository.updated?.items.first.fishingRodId, 'deleted-rod');
    expect(find.text('견적이 수정되었습니다'), findsOneWidget);
  });

  testWidgets('견적 항목 수량을 수정하고 명시적으로 저장한다', (tester) async {
    final repository = _RecordingRepository();
    await tester.pumpWidget(
      app(const QuoteDetailScreen(quoteId: 'quote-1'), repository: repository),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('견적 수정'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byTooltip('항목 편집'));
    await tester.tap(find.byTooltip('항목 편집'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('항목 수정'));
    await tester.pumpAndSettle();
    await tester.enterText(field('수량'), '3');
    await tester.tap(find.text('적용'));
    await tester.pumpAndSettle();
    expect(repository.updated, isNull);
    await tester.tap(find.text('수정 내용 저장'));
    await tester.pumpAndSettle();

    expect(repository.updated?.items.first.quantity, 3);
    expect(repository.updated?.items.first.length, 32);
    expect(repository.updated?.items.first.finalUnitPrice, 65000);
    expect(repository.updated?.totalPrice, 195000);
  });

  testWidgets('휴대폰 화면에서 내역과 상세 및 수정 창을 표시한다', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(app(const QuoteHistoryScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(app(const QuoteDetailScreen(quoteId: 'quote-1')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('견적 수정'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.byTooltip('항목 편집'));
    await tester.tap(find.byTooltip('항목 편집'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('항목 수정'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('견적 항목 수정'), findsOneWidget);
  });
}
