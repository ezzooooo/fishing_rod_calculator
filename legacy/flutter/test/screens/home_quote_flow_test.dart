import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/brand_provider.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_draft_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_provider.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/screens/home_screen.dart';
import 'package:fishing_rod_calculator/widgets/app_text_fields.dart';
import 'package:fishing_rod_calculator/widgets/save_quote_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/firebase_test_environment.dart';

class _CapturingRepository extends Fake implements QuoteRepository {
  String? title;
  String? note;
  String? customerName;
  CalculationMode? mode;
  List<QuoteItem>? items;
  int calls = 0;
  bool fail = false;

  @override
  Future<String> create({
    required String title,
    required String note,
    required CalculationMode mode,
    required List<QuoteItem> items,
    String customerName = '',
  }) async {
    calls++;
    if (fail) throw StateError('offline');
    this.title = title;
    this.note = note;
    this.customerName = customerName;
    this.mode = mode;
    this.items = List.of(items);
    return 'saved-quote';
  }
}

void main() {
  Future<ProviderContainer> openBuilder(
    WidgetTester tester,
    _CapturingRepository repository,
  ) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final container = ProviderContainer(
      overrides: [
        ...firebaseTestOverrides(),
        quoteRepositoryProvider.overrideWithValue(repository),
      ],
    );
    await container.read(brandProvider.notifier).addBrandWithId('brand', '송원');
    for (final row in [
      ('rod-1', '독야1', 15900.0, 19800.0),
      ('rod-2', '체어맨 블루', 22600.0, 30400.0),
    ]) {
      await container
          .read(fishingRodProvider.notifier)
          .addFishingRodWithId(
            id: row.$1,
            name: row.$2,
            brandId: 'brand',
            minValue: 18,
            maxValue: 18,
            usedPrice: row.$3,
            purchaseLengthPrices: {18: row.$3},
            saleLengthPrices: {18: row.$4},
          );
    }
    final router = GoRouter(
      routes: [
        GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
        GoRoute(
          path: '/quotes',
          builder: (context, state) => const Scaffold(body: Text('견적 목록 도착')),
        ),
        GoRoute(
          path: '/quotes/:id',
          builder: (_, state) =>
              Scaffold(body: Text('견적 상세 ${state.pathParameters['id']}')),
        ),
      ],
    );
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      router.dispose();
      container.dispose();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
    return container;
  }

  Finder field(String label) => find.byWidgetPredicate(
    (widget) =>
        widget is AppTextFormField && widget.decoration?.labelText == label,
  );

  Future<void> addRod(
    WidgetTester tester,
    String name,
    int quantity, {
    bool customRate = false,
  }) async {
    await tester.ensureVisible(find.text('낚시대 추가').first);
    await tester.tap(find.text('낚시대 추가').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('[송원] $name').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('quote-quantity-18')),
      '$quantity',
    );
    if (customRate) {
      await tester.tap(find.byKey(const ValueKey('quote-rate-18')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('65%').last);
    }
    await tester.pumpAndSettle();
    await tester.tap(find.text('견적에 담기'));
    await tester.pumpAndSettle();
  }

  for (final mode in CalculationMode.values) {
    testWidgets('${mode.label}에서 여러 종류를 한 고객 견적으로 한 번에 저장한다', (tester) async {
      final repository = _CapturingRepository();
      final container = await openBuilder(tester, repository);
      await tester.enterText(field('고객명 (선택)'), '김민수');
      await tester.enterText(field('메모 (선택)'), '다음 주 방문');
      if (mode == CalculationMode.sale) {
        await tester.tap(find.widgetWithText(ChoiceChip, '판매'));
        await tester.pumpAndSettle();
      }
      await addRod(tester, '독야1', 2, customRate: true);
      await addRod(tester, '체어맨 블루', 3);
      final expectedTotal = mode == CalculationMode.purchase ? 65000 : 92000;
      expect(container.read(quoteDraftProvider).totalPrice, expectedTotal);
      expect(repository.calls, 0);
      await tester.tap(find.text('견적 저장'));
      await tester.pumpAndSettle();
      expect(find.byType(SaveQuoteDialog), findsOneWidget);
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(repository.calls, 1);
      expect(repository.customerName, '김민수');
      expect(repository.note, '다음 주 방문');
      expect(repository.mode, mode);
      expect(repository.items, hasLength(2));
      expect(repository.items!.map((item) => item.fishingRodId).toSet(), {
        'rod-1',
        'rod-2',
      });
      expect(repository.items!.first.quantity, 2);
      expect(repository.items!.last.quantity, 3);
      expect(repository.items!.first.rate, .65);
      expect(repository.items!.last.rate, .7);
      expect(
        repository.items!.fold(0.0, (total, item) => total + item.totalPrice),
        expectedTotal,
      );
      expect(container.read(quoteDraftProvider).hasContent, isFalse);
      expect(find.text('견적 상세 saved-quote'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('저장 실패와 취소 후에도 고객과 담은 모든 낚시대를 유지한다', (tester) async {
    final repository = _CapturingRepository()..fail = true;
    final container = await openBuilder(tester, repository);
    await tester.enterText(field('고객명 (선택)'), '김민수');
    await addRod(tester, '독야1', 2);
    await addRod(tester, '체어맨 블루', 3);
    await tester.tap(find.text('견적 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.textContaining('견적을 저장하지 못했습니다'), findsOneWidget);
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(container.read(quoteDraftProvider).rodCount, 2);
    expect(container.read(quoteDraftProvider).totalQuantity, 5);
    expect(container.read(quoteDraftProvider).customerName, '김민수');
  });

  testWidgets('상단 버튼으로 저장된 견적 목록을 연다', (tester) async {
    final repository = _CapturingRepository();
    await openBuilder(tester, repository);
    await tester.tap(find.byTooltip('견적 내역'));
    await tester.pumpAndSettle();
    expect(find.text('견적 목록 도착'), findsOneWidget);
    expect(repository.calls, 0);
  });
}
