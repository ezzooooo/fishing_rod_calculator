import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'firebase/firebase_bootstrap.dart';
import 'routes/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final bootstrapResult = await FirebaseBootstrap.initialize();

  runApp(
    ProviderScope(
      child: FishingRodCalculatorApp(
        firebaseReady: bootstrapResult.isReady,
        firebaseErrorMessage: bootstrapResult.errorMessage,
      ),
    ),
  );
}

class FishingRodCalculatorApp extends ConsumerWidget {
  const FishingRodCalculatorApp({
    super.key,
    this.firebaseReady = true,
    this.firebaseErrorMessage,
  });

  final bool firebaseReady;
  final String? firebaseErrorMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!firebaseReady) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        title: '낚시대 계산기',
        home: _FirebaseSetupScreen(errorMessage: firebaseErrorMessage),
      );
    }

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
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}

class _FirebaseSetupScreen extends StatelessWidget {
  const _FirebaseSetupScreen({this.errorMessage});

  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Firebase 설정 필요',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Firebase 설정 파일이 필요합니다. 프로젝트 루트에서 '
                    '`flutterfire configure`를 실행해 주세요.',
                  ),
                  const SizedBox(height: 12),
                  const SelectableText(
                    '필수 확인 항목:\n'
                    '- lib/firebase_options.dart 생성\n'
                    '- Android/iOS/macOS 설정 파일 생성\n'
                    '- Firebase Authentication(이메일/비밀번호) 활성화',
                  ),
                  if (errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      errorMessage!,
                      style: TextStyle(color: Colors.red.shade700),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
