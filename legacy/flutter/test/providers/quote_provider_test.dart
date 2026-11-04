import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/auth_provider.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:fishing_rod_calculator/providers/quote_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Authorization/validation failures must happen before any SDK access.
class _UnusedFirestore implements FirebaseFirestore {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Firestore에 접근하면 안 됩니다.');
}

class _RecordingFirestore implements FirebaseFirestore {
  final document = _RecordingDocument();
  final transaction = _RecordingTransaction();

  @override
  CollectionReference<Map<String, dynamic>> collection(String path) {
    expect(path, 'quote_records');
    return _RecordingCollection(document);
  }

  @override
  Future<T> runTransaction<T>(
    TransactionHandler<T> transactionHandler, {
    Duration timeout = const Duration(seconds: 30),
    int maxAttempts = 5,
  }) => transactionHandler(transaction);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// SDK interfaces carry @sealed metadata; these minimal fakes stay in tests.
// ignore: subtype_of_sealed_class
class _RecordingCollection
    implements CollectionReference<Map<String, dynamic>> {
  _RecordingCollection(this.document);
  final _RecordingDocument document;

  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) => document;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _RecordingDocument implements DocumentReference<Map<String, dynamic>> {
  final _writes = <Map<String, dynamic>>[];
  Map<String, dynamic>? get createdData =>
      _writes.isEmpty ? null : _writes.last;

  @override
  String get id => 'generated-quote';

  @override
  Future<void> set(Map<String, dynamic> data, [SetOptions? options]) async {
    _writes.add(Map.from(data));
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _RecordingTransaction implements Transaction {
  Map<String, dynamic>? previous;
  Map<Object, Object?>? changes;

  @override
  Future<DocumentSnapshot<T>> get<T extends Object?>(
    DocumentReference<T> documentReference,
  ) async => _RecordingSnapshot<T>(previous as T?);

  @override
  Transaction update(
    DocumentReference documentReference,
    Map<Object, Object?> data,
  ) {
    changes = Map.from(data);
    return this;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class _RecordingSnapshot<T extends Object?> implements DocumentSnapshot<T> {
  _RecordingSnapshot(this.value);
  final T? value;

  @override
  T? data() => value;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  final item = QuoteItem.priced(
    fishingRodId: 'rod',
    fishingRodName: '독야',
    brandName: '송원',
    length: 20,
    quantity: 2,
    unitPrice: 10000,
    rate: 0.7,
    mode: CalculationMode.purchase,
  );

  QuoteRepository repositoryFor(_RecordingFirestore firestore) =>
      QuoteRepository(
        firestore,
        currentUserId: () => 'staff',
        isAuthorized: () => true,
      );

  QuoteRecord existingRecord({int revision = 0}) => QuoteRecord(
    id: 'generated-quote',
    title: '기존 견적',
    note: '',
    createdBy: 'original-staff',
    mode: CalculationMode.purchase,
    items: [item],
    createdAt: DateTime.utc(2026, 11, 4),
    revision: revision,
  );

  test('생성 시 이름·가격 스냅샷과 작성자·서버 시간을 한 문서에 저장한다', () async {
    final firestore = _RecordingFirestore();
    final id = await repositoryFor(firestore).create(
      title: '  고객 견적  ',
      note: '  전화 문의  ',
      customerName: '  김민수  ',
      mode: CalculationMode.sale,
      items: [item],
    );
    final data = firestore.document.createdData!;
    expect(id, 'generated-quote');
    expect(data['title'], '고객 견적');
    expect(data['note'], '전화 문의');
    expect(data['customerName'], '김민수');
    expect(data['createdBy'], 'staff');
    expect(data['createdAt'], isA<FieldValue>());
    expect(data['clientCreatedAt'], isA<Timestamp>());
    expect(data['revision'], 0);
    expect(data['totalQuantity'], 2);
    expect(data['totalPrice'], 14000);
    final storedItem = (data['items'] as List).single as Map;
    expect(storedItem['fishingRodName'], '독야');
    expect(storedItem['finalUnitPrice'], 7000);
  });

  test('수정 시 최초 기록 시간·작성자는 쓰지 않고 버전과 수정 시간만 갱신한다', () async {
    final firestore = _RecordingFirestore();
    final original = existingRecord(revision: 2);
    firestore.transaction.previous = original.toJson();
    final draft = original.copyWith(
      title: '수정 견적',
      note: '수량 변경',
      customerName: '박민수',
      createdBy: 'forged-author',
      createdAt: DateTime.utc(2000),
      items: [item.copyWith(quantity: 5)],
    );
    await repositoryFor(firestore).update(draft);
    final changes = firestore.transaction.changes!;
    expect(changes['title'], '수정 견적');
    expect(changes['customerName'], '박민수');
    expect(changes['totalQuantity'], 5);
    expect(changes['totalPrice'], 35000);
    expect(changes['revision'], 3);
    expect(changes['updatedAt'], isA<FieldValue>());
    expect(changes.containsKey('createdAt'), isFalse);
    expect(changes.containsKey('createdBy'), isFalse);
    expect(firestore.transaction.previous!['createdBy'], 'original-staff');
  });

  test('동시 수정에서 이전 버전으로 저장하면 덮어쓰지 않고 충돌을 알린다', () async {
    final firestore = _RecordingFirestore();
    firestore.transaction.previous = existingRecord(revision: 2).toJson();
    await expectLater(
      repositoryFor(firestore).update(existingRecord(revision: 1)),
      throwsA(isA<QuoteConflictException>()),
    );
    expect(firestore.transaction.changes, isNull);
  });

  test('편집 중 삭제된 견적을 다시 생성하지 않는다', () async {
    final firestore = _RecordingFirestore();
    await expectLater(
      repositoryFor(firestore).update(existingRecord()),
      throwsStateError,
    );
    expect(firestore.transaction.changes, isNull);
  });

  test('로그아웃·권한 없음 상태에서 견적 목록과 상세를 구독하지 않는다', () async {
    for (final status in [
      SessionStatus.signedOut,
      SessionStatus.unauthorized,
    ]) {
      final container = ProviderContainer(
        overrides: [sessionStatusProvider.overrideWithValue(status)],
      );
      try {
        expect(await container.read(quoteRecordsProvider.future), isEmpty);
        expect(
          await container.read(quoteRecordProvider('quote').future),
          isNull,
        );
      } finally {
        container.dispose();
      }
    }
  });

  test('로그아웃 후 열린 화면에서도 생성·수정·삭제를 거부한다', () async {
    var authorized = true;
    final repository = QuoteRepository(
      _UnusedFirestore(),
      currentUserId: () => 'staff',
      isAuthorized: () => authorized,
    );
    authorized = false;
    final record = QuoteRecord(
      id: 'quote',
      title: '견적',
      note: '',
      createdBy: 'staff',
      mode: CalculationMode.purchase,
      items: [item],
      createdAt: DateTime.now(),
    );
    await expectLater(
      repository.create(
        title: '견적',
        note: '',
        mode: record.mode,
        items: [item],
      ),
      throwsStateError,
    );
    await expectLater(repository.update(record), throwsStateError);
    await expectLater(repository.delete('quote'), throwsStateError);
  });

  test('직원 UID가 없으면 승인된 세션 표시만으로 저장하지 않는다', () async {
    final repository = QuoteRepository(
      _UnusedFirestore(),
      currentUserId: () => null,
      isAuthorized: () => true,
    );
    await expectLater(
      repository.create(
        title: '견적',
        note: '',
        mode: CalculationMode.purchase,
        items: [item],
      ),
      throwsStateError,
    );
  });

  test('빈 제목·빈 견적·잘못된 항목은 저장 전에 거부한다', () async {
    final repository = QuoteRepository(
      _UnusedFirestore(),
      currentUserId: () => 'staff',
      isAuthorized: () => true,
    );
    await expectLater(
      repository.create(
        title: '  ',
        note: '',
        mode: CalculationMode.purchase,
        items: [item],
      ),
      throwsArgumentError,
    );
    await expectLater(
      repository.create(
        title: '견적',
        note: '',
        mode: CalculationMode.purchase,
        items: [],
      ),
      throwsArgumentError,
    );
    await expectLater(
      repository.create(
        title: '견적',
        note: '',
        mode: CalculationMode.purchase,
        items: [item.copyWith(quantity: 0)],
      ),
      throwsArgumentError,
    );
  });

  test('고객명은 선택 입력이며 너무 긴 이름은 저장 전에 거부한다', () async {
    final firestore = _RecordingFirestore();
    await repositoryFor(firestore).create(
      title: '고객명 없는 견적',
      note: '',
      mode: CalculationMode.purchase,
      items: [item],
    );
    expect(firestore.document.createdData!['customerName'], '');
    await expectLater(
      repositoryFor(firestore).create(
        title: '견적',
        note: '',
        customerName: '가' * 121,
        mode: CalculationMode.purchase,
        items: [item],
      ),
      throwsArgumentError,
    );
  });
}
