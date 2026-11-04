import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:fishing_rod_calculator/providers/auth_provider.dart';

/// Keeps tests on the real app providers without native Firebase or live data.
List<Override> firebaseTestOverrides({
  bool admin = false,
  SessionStatus status = SessionStatus.authorized,
  TestFirestore? firestore,
}) {
  final database = firestore ?? TestFirestore();
  final user = status == SessionStatus.signedOut
      ? null
      : _TestUser(admin ? systemSettingsAdminUid : 'test-staff');
  return [
    firebaseFirestoreProvider.overrideWith((ref) {
      ref.onDispose(database.dispose);
      return database;
    }),
    sessionStatusProvider.overrideWithValue(status),
    currentUserProvider.overrideWithValue(user),
    authStateChangesProvider.overrideWith((ref) => Stream.value(user)),
    canAccessSystemSettingsProvider.overrideWithValue(admin),
  ];
}

ProviderContainer createTestContainer({
  bool admin = false,
  SessionStatus status = SessionStatus.authorized,
  TestFirestore? firestore,
}) => ProviderContainer(
  overrides: firebaseTestOverrides(
    admin: admin,
    status: status,
    firestore: firestore,
  ),
);

class _TestUser implements User {
  _TestUser(this.uid);

  @override
  final String uid;

  @override
  String get email => '$uid@example.test';

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// A deliberately small Firestore facade for the collection operations we use.
/// Unsupported SDK calls fail through noSuchMethod instead of touching Firebase.
class TestFirestore implements FirebaseFirestore {
  final _collections = <String, _CollectionState>{};
  int _nextId = 0;

  _CollectionState _state(String path) =>
      _collections.putIfAbsent(path, _CollectionState.new);

  @override
  CollectionReference<Map<String, dynamic>> collection(String path) =>
      _TestCollection(this, path);

  @override
  WriteBatch batch() => _TestBatch();

  void dispose() {
    for (final collection in _collections.values) {
      unawaited(collection.changes.close());
    }
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _CollectionState {
  final documents = <String, Map<String, dynamic>>{};
  final changes = StreamController<void>.broadcast(sync: true);
}

// Test doubles implement SDK interfaces so application providers stay unchanged.
// ignore: subtype_of_sealed_class
class _TestCollection implements CollectionReference<Map<String, dynamic>> {
  _TestCollection(this.firestore, this.path);

  @override
  final TestFirestore firestore;
  @override
  final String path;

  @override
  String get id => path.split('/').last;

  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) =>
      _TestDocument(this, path ?? 'test-id-${firestore._nextId++}');

  _TestQuerySnapshot _snapshot() => _TestQuerySnapshot([
    for (final entry in firestore._state(path).documents.entries)
      _TestQueryDocument(doc(entry.key), entry.value),
  ]);

  @override
  Future<QuerySnapshot<Map<String, dynamic>>> get([
    GetOptions? options,
  ]) async => _snapshot();

  @override
  Stream<QuerySnapshot<Map<String, dynamic>>> snapshots({
    bool includeMetadataChanges = false,
    ListenSource source = ListenSource.defaultSource,
  }) => Stream.multi((controller) {
    controller.add(_snapshot());
    final subscription = firestore._state(path).changes.stream.listen((_) {
      controller.add(_snapshot());
    });
    controller.onCancel = subscription.cancel;
  });

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _TestDocument implements DocumentReference<Map<String, dynamic>> {
  _TestDocument(this.parent, this.id);

  @override
  final _TestCollection parent;
  @override
  final String id;
  @override
  TestFirestore get firestore => parent.firestore;
  @override
  String get path => '${parent.path}/$id';

  @override
  Future<void> set(Map<String, dynamic> data, [SetOptions? options]) async {
    final state = firestore._state(parent.path);
    state.documents[id] = Map<String, dynamic>.from(data);
    state.changes.add(null);
  }

  @override
  Future<void> delete() async {
    final state = firestore._state(parent.path);
    state.documents.remove(id);
    state.changes.add(null);
  }

  @override
  Future<DocumentSnapshot<Map<String, dynamic>>> get([
    GetOptions? options,
  ]) async =>
      _TestDocumentSnapshot(this, firestore._state(parent.path).documents[id]);

  @override
  Stream<DocumentSnapshot<Map<String, dynamic>>> snapshots({
    bool includeMetadataChanges = false,
    ListenSource source = ListenSource.defaultSource,
  }) => parent.snapshots().map(
    (_) => _TestDocumentSnapshot(
      this,
      firestore._state(parent.path).documents[id],
    ),
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _TestQuerySnapshot implements QuerySnapshot<Map<String, dynamic>> {
  _TestQuerySnapshot(this.docs);
  @override
  final List<QueryDocumentSnapshot<Map<String, dynamic>>> docs;
  @override
  int get size => docs.length;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _TestDocumentSnapshot implements DocumentSnapshot<Map<String, dynamic>> {
  _TestDocumentSnapshot(this.reference, Map<String, dynamic>? data)
    : _data = data == null ? null : Map.from(data);
  @override
  final DocumentReference<Map<String, dynamic>> reference;
  final Map<String, dynamic>? _data;
  @override
  String get id => reference.id;
  @override
  bool get exists => _data != null;
  @override
  Map<String, dynamic>? data() => _data == null ? null : Map.from(_data);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _TestQueryDocument extends _TestDocumentSnapshot
    implements QueryDocumentSnapshot<Map<String, dynamic>> {
  _TestQueryDocument(super.reference, super.data);
  @override
  Map<String, dynamic> data() => super.data()!;
}

class _TestBatch implements WriteBatch {
  final _operations = <Future<void> Function()>[];

  @override
  void set<T>(DocumentReference<T> document, T data, [SetOptions? options]) {
    _operations.add(() => document.set(data, options));
  }

  @override
  void delete(DocumentReference document) {
    _operations.add(document.delete);
  }

  @override
  Future<void> commit() async {
    for (final operation in _operations) {
      await operation();
    }
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
