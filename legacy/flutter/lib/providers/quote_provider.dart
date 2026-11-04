import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/quote_record.dart';
import 'auth_provider.dart';
import 'calculation_provider.dart';

class QuoteConflictException implements Exception {
  const QuoteConflictException();

  @override
  String toString() => '다른 직원이 이 견적을 수정했습니다. 최신 내역을 확인한 뒤 다시 수정해주세요.';
}

class QuoteRepository {
  QuoteRepository(
    this._firestore, {
    required String? Function() currentUserId,
    required bool Function() isAuthorized,
  }) : _currentUserId = currentUserId,
       _isAuthorized = isAuthorized;

  final FirebaseFirestore _firestore;
  final String? Function() _currentUserId;
  final bool Function() _isAuthorized;

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection('quote_records');

  String _ensureAuthorized() {
    final uid = _currentUserId();
    if (!_isAuthorized() || uid == null) {
      throw StateError('로그인된 직원만 견적 내역을 변경할 수 있습니다.');
    }
    return uid;
  }

  Future<String> create({
    required String title,
    required String note,
    required CalculationMode mode,
    required List<QuoteItem> items,
    String customerName = '',
  }) async {
    final uid = _ensureAuthorized();
    _validate(title, note, items, customerName);
    final document = _collection.doc();
    final now = DateTime.now();
    final record = QuoteRecord(
      id: document.id,
      title: title.trim(),
      note: note.trim(),
      customerName: customerName.trim(),
      createdBy: uid,
      mode: mode,
      items: items,
      createdAt: now,
    );
    final data = record.toJson()..remove('id');
    data['createdAt'] = FieldValue.serverTimestamp();
    data['clientCreatedAt'] = Timestamp.fromDate(now);
    await document.set(data);
    return document.id;
  }

  Future<void> update(QuoteRecord record) async {
    _ensureAuthorized();
    _validate(record.title, record.note, record.items, record.customerName);
    final document = _collection.doc(record.id);
    await _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(document);
      final previous = snapshot.data();
      if (previous == null) {
        throw StateError('삭제된 견적입니다. 견적 내역을 다시 확인해주세요.');
      }
      if (((previous['revision'] as num?)?.toInt() ?? 0) != record.revision) {
        throw const QuoteConflictException();
      }
      transaction.update(document, {
        'title': record.title.trim(),
        'note': record.note.trim(),
        'customerName': record.customerName.trim(),
        'mode': record.mode.name,
        'items': record.items.map((item) => item.toJson()).toList(),
        'totalQuantity': record.totalQuantity,
        'totalPrice': record.totalPrice,
        'updatedAt': FieldValue.serverTimestamp(),
        'clientUpdatedAt': Timestamp.fromDate(DateTime.now()),
        'revision': record.revision + 1,
      });
    });
  }

  Future<void> delete(String id) async {
    _ensureAuthorized();
    await _collection.doc(id).delete();
  }

  void _validate(
    String title,
    String note,
    List<QuoteItem> items,
    String customerName,
  ) {
    if (title.trim().isEmpty || title.trim().length > 120) {
      throw ArgumentError('견적 제목을 1~120자로 입력해주세요.');
    }
    if (note.trim().length > 4000) {
      throw ArgumentError('메모는 4,000자 이내로 입력해주세요.');
    }
    if (customerName.trim().length > 120) {
      throw ArgumentError('고객명은 120자 이내로 입력해주세요.');
    }
    if (items.isEmpty || items.length > 500) {
      throw ArgumentError('견적 항목을 1~500개 입력해주세요.');
    }
    for (final item in items) {
      if (item.fishingRodName.trim().isEmpty ||
          item.length <= 0 ||
          item.quantity <= 0 ||
          !item.unitPrice.isFinite ||
          item.unitPrice < 0 ||
          !item.rate.isFinite ||
          item.rate < 0 ||
          item.rate > 1 ||
          !item.finalUnitPrice.isFinite ||
          item.finalUnitPrice < 0 ||
          !item.totalPrice.isFinite) {
        throw ArgumentError('낚시대명, 칸수, 수량, 가격과 적용율을 확인해주세요.');
      }
    }
  }
}

final quoteRepositoryProvider = Provider<QuoteRepository>((ref) {
  return QuoteRepository(
    ref.watch(firebaseFirestoreProvider),
    currentUserId: () => ref.read(currentUserProvider)?.uid,
    isAuthorized: () =>
        ref.read(sessionStatusProvider) == SessionStatus.authorized,
  );
});

final quoteRecordsProvider = StreamProvider.autoDispose<List<QuoteRecord>>((
  ref,
) {
  final status = ref.watch(sessionStatusProvider);
  if (status != SessionStatus.authorized) return Stream.value([]);
  // Re-subscribe when staff accounts change, including between authorized users.
  ref.watch(currentUserProvider);
  return ref
      .watch(firebaseFirestoreProvider)
      .collection('quote_records')
      .orderBy('createdAt', descending: true)
      .snapshots()
      .map((snapshot) {
        final records = snapshot.docs
            .map((doc) => QuoteRecord.fromJson({...doc.data(), 'id': doc.id}))
            .toList();
        records.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        return records;
      });
});

final quoteRecordProvider = StreamProvider.autoDispose
    .family<QuoteRecord?, String>((ref, id) {
      final status = ref.watch(sessionStatusProvider);
      if (status != SessionStatus.authorized) return Stream.value(null);
      ref.watch(currentUserProvider);
      return ref
          .watch(firebaseFirestoreProvider)
          .collection('quote_records')
          .doc(id)
          .snapshots()
          .map((doc) {
            final data = doc.data();
            return data == null
                ? null
                : QuoteRecord.fromJson({...data, 'id': doc.id});
          });
    });
