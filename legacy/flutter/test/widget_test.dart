import 'package:fishing_rod_calculator/main.dart';
import 'package:fishing_rod_calculator/providers/auth_provider.dart';
import 'package:fishing_rod_calculator/routes/app_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/firebase_test_environment.dart';

void main() {
  Future<void> startApp(
    WidgetTester tester, {
    SessionStatus status = SessionStatus.authorized,
  }) async {
    final container = createTestContainer(status: status);
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

  testWidgets('승인된 직원은 계산기로 시작한다', (tester) async {
    await startApp(tester);
    expect(find.text('새 견적 만들기'), findsOneWidget);
    expect(find.text('등록된 낚시대가 없습니다'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('로그아웃 상태에서는 직원 로그인 화면으로 시작한다', (tester) async {
    await startApp(tester, status: SessionStatus.signedOut);
    expect(find.text('직원 로그인'), findsOneWidget);
    expect(find.text('이메일'), findsOneWidget);
    expect(find.text('비밀번호'), findsOneWidget);
    expect(find.text('등록된 낚시대가 없습니다'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('직원 권한이 없는 계정은 접근 권한 안내를 표시한다', (tester) async {
    await startApp(tester, status: SessionStatus.unauthorized);
    expect(find.text('접근 권한 없음'), findsOneWidget);
    expect(find.text('다른 계정으로 로그인'), findsOneWidget);
    expect(find.text('낚시대 계산기'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Firebase 초기화 실패 시 실제 SDK 접근 없이 설정 오류를 표시한다', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: FishingRodCalculatorApp(
          firebaseReady: false,
          firebaseErrorMessage: '테스트용 초기화 오류',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Firebase 설정 필요'), findsOneWidget);
    expect(find.text('테스트용 초기화 오류'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
