import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/brand.dart';
import 'auth_provider.dart';

const _uuid = Uuid();

class BrandNotifier extends StateNotifier<List<Brand>> {
  BrandNotifier(this._firestore) : super([]);

  final FirebaseFirestore _firestore;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _subscription;
  SessionStatus _sessionStatus = SessionStatus.loading;

  CollectionReference<Map<String, dynamic>> get _brandsCollection =>
      _firestore.collection('brands');

  void handleSessionStatus(SessionStatus status) {
    if (_sessionStatus == status) {
      return;
    }

    _sessionStatus = status;
    if (status == SessionStatus.authorized) {
      _startListening();
    } else {
      _stopListening();
      state = [];
    }
  }

  void _startListening() {
    _stopListening();

    _subscription = _brandsCollection.snapshots().listen(
      (snapshot) {
        final brands = snapshot.docs.map(_brandFromDoc).toList()
          ..sort((a, b) => a.name.compareTo(b.name));
        state = brands;
      },
      onError: (error, stackTrace) {
        state = [];
      },
    );
  }

  Brand _brandFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = Map<String, dynamic>.from(doc.data());
    data['id'] = doc.id;
    _normalizeDateField(data, 'createdAt');
    _normalizeDateField(data, 'updatedAt');
    return Brand.fromJson(data);
  }

  void _normalizeDateField(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is Timestamp) {
      data[key] = value.toDate().toIso8601String();
    }
  }

  void _stopListening() {
    _subscription?.cancel();
    _subscription = null;
  }

  Future<void> _ensureAuthorized() async {
    if (_sessionStatus != SessionStatus.authorized) {
      throw StateError('로그인된 직원만 데이터를 변경할 수 있습니다.');
    }
  }

  Future<void> _commitBatchOperations(
    List<void Function(WriteBatch batch)> operations,
  ) async {
    const maxBatchSize = 400;
    for (var i = 0; i < operations.length; i += maxBatchSize) {
      final batch = _firestore.batch();
      final end = (i + maxBatchSize > operations.length)
          ? operations.length
          : i + maxBatchSize;
      for (var j = i; j < end; j++) {
        operations[j](batch);
      }
      await batch.commit();
    }
  }

  Future<void> addBrand(String name) async {
    await _ensureAuthorized();

    final newBrand = Brand(
      id: _uuid.v4(),
      name: name,
      createdAt: DateTime.now(),
    );
    await _brandsCollection.doc(newBrand.id).set(newBrand.toJson());
  }

  Future<void> addBrandWithId(String id, String name) async {
    await _ensureAuthorized();

    final newBrand = Brand(id: id, name: name, createdAt: DateTime.now());
    await _brandsCollection.doc(id).set(newBrand.toJson());
  }

  Future<void> replaceBrands(List<Brand> brands) async {
    await _ensureAuthorized();

    final existing = await _brandsCollection.get();
    final operations = <void Function(WriteBatch batch)>[];

    for (final doc in existing.docs) {
      operations.add((batch) => batch.delete(doc.reference));
    }

    for (final brand in brands) {
      operations.add(
        (batch) => batch.set(_brandsCollection.doc(brand.id), brand.toJson()),
      );
    }

    await _commitBatchOperations(operations);
  }

  Future<void> updateBrand(String id, String name) async {
    await _ensureAuthorized();

    final existing = getBrandById(id);
    if (existing == null) {
      return;
    }

    final updated = existing.copyWith(name: name, updatedAt: DateTime.now());
    await _brandsCollection.doc(id).set(updated.toJson());
  }

  Future<void> deleteBrand(String id) async {
    await _ensureAuthorized();
    await _brandsCollection.doc(id).delete();
  }

  Brand? getBrandById(String id) {
    try {
      return state.firstWhere((brand) => brand.id == id);
    } catch (e) {
      return null;
    }
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }
}

final brandProvider = StateNotifierProvider<BrandNotifier, List<Brand>>((ref) {
  final notifier = BrandNotifier(ref.watch(firebaseFirestoreProvider));
  notifier.handleSessionStatus(ref.read(sessionStatusProvider));

  ref.listen<SessionStatus>(sessionStatusProvider, (_, next) {
    notifier.handleSessionStatus(next);
  });

  return notifier;
});

// 브랜드를 ID로 찾는 프로바이더
final brandByIdProvider = Provider.family<Brand?, String>((ref, id) {
  final brands = ref.watch(brandProvider);
  try {
    return brands.firstWhere((brand) => brand.id == id);
  } catch (e) {
    return null;
  }
});
