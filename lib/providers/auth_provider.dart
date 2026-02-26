import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum SessionStatus { loading, signedOut, unauthorized, authorized }

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) {
  return FirebaseAuth.instance;
});

final firebaseFirestoreProvider = Provider<FirebaseFirestore>((ref) {
  return FirebaseFirestore.instance;
});

final authStateChangesProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

final staffEnabledProvider = StreamProvider.family<bool, String>((ref, uid) {
  return ref
      .watch(firebaseFirestoreProvider)
      .collection('staff')
      .doc(uid)
      .snapshots()
      .map((doc) {
        final data = doc.data();
        return data != null && data['enabled'] == true;
      });
});

final sessionStatusProvider = Provider<SessionStatus>((ref) {
  final authState = ref.watch(authStateChangesProvider);

  return authState.when(
    loading: () => SessionStatus.loading,
    error: (error, stackTrace) => SessionStatus.signedOut,
    data: (user) {
      if (user == null) {
        return SessionStatus.signedOut;
      }

      final staffState = ref.watch(staffEnabledProvider(user.uid));
      return staffState.when(
        loading: () => SessionStatus.loading,
        error: (error, stackTrace) => SessionStatus.unauthorized,
        data: (enabled) {
          return enabled
              ? SessionStatus.authorized
              : SessionStatus.unauthorized;
        },
      );
    },
  );
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateChangesProvider).valueOrNull;
});

class AuthController {
  AuthController(this._auth);

  final FirebaseAuth _auth;

  Future<void> signIn({required String email, required String password}) async {
    await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}

final authControllerProvider = Provider<AuthController>((ref) {
  return AuthController(ref.watch(firebaseAuthProvider));
});
