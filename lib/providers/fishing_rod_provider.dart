import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/fishing_rod.dart';
import 'auth_provider.dart';

const _uuid = Uuid();

class FishingRodNotifier extends StateNotifier<List<FishingRod>> {
  FishingRodNotifier(this._firestore) : super([]);

  final FirebaseFirestore _firestore;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _subscription;
  SessionStatus _sessionStatus = SessionStatus.loading;

  CollectionReference<Map<String, dynamic>> get _rodsCollection =>
      _firestore.collection('fishing_rods');

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

    _subscription = _rodsCollection.snapshots().listen(
      (snapshot) {
        final rods = snapshot.docs.map(_rodFromDoc).toList()
          ..sort((a, b) => a.name.compareTo(b.name));
        state = rods;
      },
      onError: (error, stackTrace) {
        state = [];
      },
    );
  }

  FishingRod _rodFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = Map<String, dynamic>.from(doc.data());
    data['id'] = doc.id;
    _normalizeDateField(data, 'createdAt');
    _normalizeDateField(data, 'updatedAt');
    return FishingRod.fromJson(data);
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

  Future<void> addFishingRod({
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    Map<int, double>? lengthPrices,
  }) async {
    await _ensureAuthorized();

    final newFishingRod = FishingRod(
      id: _uuid.v4(),
      name: name,
      brandId: brandId,
      minValue: minValue,
      maxValue: maxValue,
      usedPrice: usedPrice,
      lengthPrices: lengthPrices ?? {},
      createdAt: DateTime.now(),
    );
    await _rodsCollection.doc(newFishingRod.id).set(newFishingRod.toJson());
  }

  Future<void> addFishingRodWithId({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    Map<int, double>? lengthPrices,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) async {
    await _ensureAuthorized();

    final fishingRod = FishingRod(
      id: id,
      name: name,
      brandId: brandId,
      minValue: minValue,
      maxValue: maxValue,
      usedPrice: usedPrice,
      lengthPrices: lengthPrices ?? {},
      createdAt: createdAt ?? DateTime.now(),
      updatedAt: updatedAt,
    );
    await _rodsCollection.doc(id).set(fishingRod.toJson());
  }

  Future<void> replaceFishingRods(List<FishingRod> fishingRods) async {
    await _ensureAuthorized();

    final existing = await _rodsCollection.get();
    final operations = <void Function(WriteBatch batch)>[];

    for (final doc in existing.docs) {
      operations.add((batch) => batch.delete(doc.reference));
    }

    for (final rod in fishingRods) {
      operations.add(
        (batch) => batch.set(_rodsCollection.doc(rod.id), rod.toJson()),
      );
    }

    await _commitBatchOperations(operations);
  }

  Future<void> updateFishingRod({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    Map<int, double>? lengthPrices,
  }) async {
    await _ensureAuthorized();

    final existing = getFishingRodById(id);
    if (existing == null) {
      return;
    }

    final updatedRod = existing.copyWith(
      name: name,
      brandId: brandId,
      minValue: minValue,
      maxValue: maxValue,
      usedPrice: usedPrice,
      lengthPrices: lengthPrices ?? existing.lengthPrices,
      updatedAt: DateTime.now(),
    );
    await _rodsCollection.doc(id).set(updatedRod.toJson());
  }

  Future<void> deleteFishingRod(String id) async {
    await _ensureAuthorized();
    await _rodsCollection.doc(id).delete();
  }

  FishingRod? getFishingRodById(String id) {
    try {
      return state.firstWhere((rod) => rod.id == id);
    } catch (e) {
      return null;
    }
  }

  List<FishingRod> getFishingRodsByBrand(String brandId) {
    return state.where((rod) => rod.brandId == brandId).toList();
  }

  List<FishingRod> searchFishingRods(String query) {
    if (query.isEmpty) return state;

    final lowercaseQuery = query.toLowerCase();
    return state.where((rod) {
      return rod.name.toLowerCase().contains(lowercaseQuery);
    }).toList();
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }
}

final fishingRodProvider =
    StateNotifierProvider<FishingRodNotifier, List<FishingRod>>((ref) {
      final notifier = FishingRodNotifier(ref.watch(firebaseFirestoreProvider));
      notifier.handleSessionStatus(ref.read(sessionStatusProvider));

      ref.listen<SessionStatus>(sessionStatusProvider, (_, next) {
        notifier.handleSessionStatus(next);
      });

      return notifier;
    });

// 낚시대를 ID로 찾는 프로바이더
final fishingRodByIdProvider = Provider.family<FishingRod?, String>((ref, id) {
  final fishingRods = ref.watch(fishingRodProvider);
  try {
    return fishingRods.firstWhere((rod) => rod.id == id);
  } catch (e) {
    return null;
  }
});

// 브랜드별 낚시대 목록을 가져오는 프로바이더
final fishingRodsByBrandProvider = Provider.family<List<FishingRod>, String>((
  ref,
  brandId,
) {
  final fishingRods = ref.watch(fishingRodProvider);
  return fishingRods.where((rod) => rod.brandId == brandId).toList();
});
