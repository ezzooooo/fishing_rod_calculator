import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'routes/app_router.dart';

void main() {
  runApp(const ProviderScope(child: FishingRodCalculatorApp()));
}

class FishingRodCalculatorApp extends StatelessWidget {
  const FishingRodCalculatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: '낚시대 계산기',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        // 전체 폰트 크기를 안전하게 조정 (기본 색상 유지)
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 68,
            color: Colors.black87,
          ), // 57 → 68
          displayMedium: TextStyle(
            fontSize: 54,
            color: Colors.black87,
          ), // 45 → 54
          displaySmall: TextStyle(
            fontSize: 43,
            color: Colors.black87,
          ), // 36 → 43
          headlineLarge: TextStyle(
            fontSize: 38,
            color: Colors.black87,
          ), // 32 → 38
          headlineMedium: TextStyle(
            fontSize: 34,
            color: Colors.black87,
          ), // 28 → 34
          headlineSmall: TextStyle(
            fontSize: 29,
            color: Colors.black87,
          ), // 24 → 29
          titleLarge: TextStyle(
            fontSize: 26,
            color: Colors.black87,
            fontWeight: FontWeight.bold,
          ), // 22 → 26
          titleMedium: TextStyle(
            fontSize: 19,
            color: Colors.black87,
          ), // 16 → 19
          titleSmall: TextStyle(fontSize: 17, color: Colors.black87), // 14 → 17
          bodyLarge: TextStyle(fontSize: 19, color: Colors.black87), // 16 → 19
          bodyMedium: TextStyle(fontSize: 17, color: Colors.black87), // 14 → 17
          bodySmall: TextStyle(fontSize: 14, color: Colors.black54), // 12 → 14
          labelLarge: TextStyle(fontSize: 17, color: Colors.black87), // 14 → 17
          labelMedium: TextStyle(
            fontSize: 14,
            color: Colors.black87,
          ), // 12 → 14
          labelSmall: TextStyle(fontSize: 13, color: Colors.black54), // 11 → 13
        ),
        // 각종 컴포넌트별 텍스트 스타일도 조정
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            textStyle: const TextStyle(fontSize: 16), // 기본 14 → 16
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            textStyle: const TextStyle(fontSize: 16), // 기본 14 → 16
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            textStyle: const TextStyle(fontSize: 16), // 기본 14 → 16
          ),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          labelStyle: TextStyle(fontSize: 18), // 기본 16 → 18
          hintStyle: TextStyle(fontSize: 16), // 기본 14 → 16
        ),
        listTileTheme: const ListTileThemeData(
          titleTextStyle: TextStyle(
            fontSize: 18,
            color: Colors.black87,
          ), // 기본 16 → 18, 색상 명시
          subtitleTextStyle: TextStyle(
            fontSize: 16,
            color: Colors.black54,
          ), // 기본 14 → 16, 색상 명시
        ),
      ),
      routerConfig: appRouter,
    );
  }
}
