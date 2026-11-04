import 'package:firebase_core/firebase_core.dart';

import '../firebase_options.dart';

class FirebaseBootstrapResult {
  const FirebaseBootstrapResult({required this.isReady, this.errorMessage});

  final bool isReady;
  final String? errorMessage;
}

class FirebaseBootstrap {
  static Future<FirebaseBootstrapResult> initialize() async {
    try {
      if (Firebase.apps.isNotEmpty) {
        return const FirebaseBootstrapResult(isReady: true);
      }

      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      return const FirebaseBootstrapResult(isReady: true);
    } catch (e) {
      return FirebaseBootstrapResult(
        isReady: false,
        errorMessage: 'Firebase 초기화 실패: $e',
      );
    }
  }
}
