// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:fishing_rod_calculator/main.dart';

void main() {
  testWidgets('App starts correctly', (WidgetTester tester) async {
    // Given
    SharedPreferences.setMockInitialValues({});

    // When
    await tester.pumpWidget(
      const ProviderScope(child: FishingRodCalculatorApp()),
    );
    await tester.pumpAndSettle();

    // Then
    expect(find.text('낚시대 계산기'), findsOneWidget);
  });
}
