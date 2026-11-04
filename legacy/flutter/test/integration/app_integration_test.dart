import 'package:fishing_rod_calculator/main.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/providers/auth_provider.dart';
import 'package:fishing_rod_calculator/providers/brand_provider.dart';
import 'package:fishing_rod_calculator/providers/fishing_rod_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_draft_provider.dart';
import 'package:fishing_rod_calculator/routes/app_router.dart';
import 'package:fishing_rod_calculator/widgets/app_text_fields.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/firebase_test_environment.dart';

void main() {
  Future<void> startApp(
    WidgetTester tester,
    ProviderContainer container,
  ) async {
    final router = container.read(appRouterProvider);
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      router.dispose();
      container.dispose();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const FishingRodCalculatorApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openMenu(WidgetTester tester) async {
    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();
  }

  Future<void> navigate(WidgetTester tester, String title) async {
    await openMenu(tester);
    await tester.tap(
      find.descendant(of: find.byType(Drawer), matching: find.text(title)),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('직원이 브랜드를 등록하고 실제 목록과 계산기로 이동한다', (tester) async {
    final container = createTestContainer();
    await startApp(tester, container);
    await navigate(tester, '브랜드 관리');
    expect(find.text('등록된 브랜드가 없습니다'), findsOneWidget);

    await tester.tap(find.byTooltip('브랜드 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(AppTextFormField), '송원');
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(container.read(brandProvider).single.name, '송원');
    expect(find.text('송원'), findsOneWidget);
    expect(find.text('브랜드가 추가되었습니다'), findsOneWidget);
    expect(
      container.read(appRouterProvider).routeInformationProvider.value.uri.path,
      '/brands',
    );

    await navigate(tester, '낚시대 관리');
    expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
    await navigate(tester, '새 견적 만들기');
    expect(find.text('새 견적 만들기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('관리자는 메뉴에서 시스템 설정과 관리 화면에 접근한다', (tester) async {
    final container = createTestContainer(admin: true);
    await startApp(tester, container);
    await navigate(tester, '시스템 설정');
    expect(find.text('시스템 설정'), findsOneWidget);
    expect(find.text('기본 브랜드 불러오기'), findsOneWidget);
    expect(find.text('기본 낚시대 불러오기'), findsOneWidget);
    expect(
      container.read(appRouterProvider).routeInformationProvider.value.uri.path,
      '/system-settings',
    );

    await navigate(tester, '브랜드 관리');
    expect(find.text('등록된 브랜드가 없습니다'), findsOneWidget);
    await navigate(tester, '낚시대 관리');
    expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
    await navigate(tester, '새 견적 만들기');
    expect(find.text('새 견적 만들기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('일반 직원은 시스템 설정 메뉴와 직접 주소 접근이 제한된다', (tester) async {
    final container = createTestContainer();
    await startApp(tester, container);
    await openMenu(tester);
    expect(
      find.descendant(of: find.byType(Drawer), matching: find.text('시스템 설정')),
      findsNothing,
    );
    await tester.tap(
      find.descendant(of: find.byType(Drawer), matching: find.text('새 견적 만들기')),
    );
    await tester.pumpAndSettle();
    container.read(appRouterProvider).go('/system-settings');
    await tester.pumpAndSettle();
    expect(
      container.read(appRouterProvider).routeInformationProvider.value.uri.path,
      '/',
    );
    expect(find.text('새 견적 만들기'), findsOneWidget);
    expect(find.text('기본 브랜드 불러오기'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('로그아웃 상태의 보호된 주소는 로그인으로 이동한다', (tester) async {
    final container = createTestContainer(status: SessionStatus.signedOut);
    await startApp(tester, container);
    container.read(appRouterProvider).go('/fishing-rods');
    await tester.pumpAndSettle();
    expect(
      container.read(appRouterProvider).routeInformationProvider.value.uri.path,
      '/login',
    );
    expect(find.text('직원 로그인'), findsOneWidget);
    expect(find.text('낚시대 관리'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('공용 저장소의 낚시대와 브랜드를 검색해 결과를 좁힌다', (tester) async {
    final container = createTestContainer();
    final brands = container.read(brandProvider.notifier);
    await brands.addBrandWithId('brand-1', '송원');
    await brands.addBrandWithId('brand-2', 'DIF');
    final rods = container.read(fishingRodProvider.notifier);
    await rods.addFishingRod(
      name: '독야1',
      brandId: 'brand-1',
      minValue: 18,
      maxValue: 20,
      usedPrice: 10000,
      lengthPrices: {18: 10000, 20: 12000},
    );
    await rods.addFishingRod(
      name: '체어맨 블루',
      brandId: 'brand-2',
      minValue: 18,
      maxValue: 20,
      usedPrice: 20000,
      lengthPrices: {18: 20000, 20: 24000},
    );
    await startApp(tester, container);
    await tester.tap(find.text('낚시대 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(AppTextField), '송원');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<FishingRod>));
    await tester.pumpAndSettle();
    expect(find.text('[송원] 독야1'), findsOneWidget);
    expect(find.text('[DIF] 체어맨 블루'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('로그아웃하면 작성 중인 고객 견적을 지우고 로그인 화면으로 이동한다', (tester) async {
    final status = StateProvider<SessionStatus>(
      (ref) => SessionStatus.authorized,
    );
    final database = TestFirestore();
    final container = ProviderContainer(
      overrides: [
        firebaseFirestoreProvider.overrideWith((ref) {
          ref.onDispose(database.dispose);
          return database;
        }),
        sessionStatusProvider.overrideWith((ref) => ref.watch(status)),
        currentUserProvider.overrideWithValue(null),
        canAccessSystemSettingsProvider.overrideWithValue(false),
      ],
    );
    await startApp(tester, container);
    await tester.enterText(find.byKey(const ValueKey('quote-customer')), '김민수');
    await tester.enterText(
      find.byKey(const ValueKey('quote-note')),
      '개인 상담 내용',
    );
    expect(container.read(quoteDraftProvider).hasContent, isTrue);
    container.read(status.notifier).state = SessionStatus.signedOut;
    await tester.pumpAndSettle();
    expect(container.read(quoteDraftProvider).hasContent, isFalse);
    expect(find.text('직원 로그인'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
