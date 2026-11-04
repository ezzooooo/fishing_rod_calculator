import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fishing_rod_calculator/models/calculation_item.dart';
import 'package:fishing_rod_calculator/models/fishing_rod.dart';
import 'package:fishing_rod_calculator/models/quote_record.dart';
import 'package:fishing_rod_calculator/providers/calculation_provider.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const rod = FishingRod(
    id: 'rod',
    name: '독야',
    brandId: 'brand',
    minValue: 20,
    maxValue: 20,
    usedPrice: 247000,
    purchaseLengthPrices: {20: 247000},
    saleLengthPrices: {20: 249000},
  );
  const calculation = CalculationItem(
    fishingRodId: 'rod',
    length: 20,
    quantity: 3,
    discountRate: 0.5,
    saleRate: 0.65,
  );

  QuoteItem snapshot(CalculationMode mode) => QuoteItem.fromCalculation(
    calculation: calculation,
    rod: rod,
    brandName: '송원',
    mode: mode,
  );

  test('매입 견적은 당시 매입가·적용율과 천원 절사 결과를 저장한다', () {
    final item = snapshot(CalculationMode.purchase);
    expect(item.fishingRodName, '독야');
    expect(item.brandName, '송원');
    expect(item.length, 20);
    expect(item.unitPrice, 247000);
    expect(item.rate, 0.5);
    expect(item.finalUnitPrice, 123000);
    expect(item.totalPrice, 369000);
  });

  test('판매 견적은 판매가·판매 적용율과 천원 올림 결과를 저장한다', () {
    final item = snapshot(CalculationMode.sale);
    expect(item.unitPrice, 249000);
    expect(item.rate, 0.65);
    expect(item.finalUnitPrice, 162000);
    expect(item.totalPrice, 486000);
  });

  test('저장한 이름과 최종 단가는 가격표 변경이나 재계산 없이 복원한다', () {
    final json = snapshot(CalculationMode.purchase).toJson();
    // Historical unit prices remain authoritative, even if rounding changes.
    json['finalUnitPrice'] = 123500;
    final restored = QuoteItem.fromJson(json);
    final changedCatalogue = rod.copyWith(
      name: '새 이름',
      purchaseLengthPrices: {20: 999000},
    );
    expect(changedCatalogue.name, '새 이름');
    expect(restored.fishingRodName, '독야');
    expect(restored.finalUnitPrice, 123500);
    expect(restored.totalPrice, 370500);
  });

  test('견적 수정은 수량·금액을 바꾸면서 최초 시간·작성자·버전을 유지한다', () {
    final createdAt = DateTime.utc(2026, 11, 4, 1);
    final updatedAt = DateTime.utc(2026, 11, 4, 2);
    final record = QuoteRecord(
      id: 'quote',
      title: '첫 견적',
      note: '',
      createdBy: 'staff',
      mode: CalculationMode.purchase,
      items: [snapshot(CalculationMode.purchase)],
      createdAt: createdAt,
      updatedAt: updatedAt,
      revision: 2,
    );
    final updated = record.copyWith(
      title: '수정 견적',
      note: '수량 변경',
      items: [record.items.first.copyWith(quantity: 5)],
    );
    expect(updated.title, '수정 견적');
    expect(updated.totalQuantity, 5);
    expect(updated.totalPrice, 615000);
    expect(updated.createdAt, createdAt);
    expect(updated.updatedAt, updatedAt);
    expect(updated.createdBy, 'staff');
    expect(updated.revision, 2);
    expect(record.totalQuantity, 3);
    expect(() => updated.items.clear(), throwsUnsupportedError);
  });

  test('견적은 JSON과 Firestore Timestamp 양쪽에서 동일하게 복원한다', () {
    final record = QuoteRecord(
      id: 'quote',
      title: '견적',
      note: '메모',
      customerName: '김민수',
      createdBy: 'staff',
      mode: CalculationMode.sale,
      items: [snapshot(CalculationMode.sale)],
      createdAt: DateTime.utc(2026, 11, 4),
      updatedAt: DateTime.utc(2026, 11, 5),
      revision: 1,
    );
    final json = record.toJson();
    expect(QuoteRecord.fromJson(json).createdAt, record.createdAt);
    json['createdAt'] = Timestamp.fromDate(record.createdAt);
    json['updatedAt'] = Timestamp.fromDate(record.updatedAt!);
    final restored = QuoteRecord.fromJson(json);
    expect(restored.createdAt, record.createdAt);
    expect(restored.updatedAt, record.updatedAt);
    expect(restored.mode, CalculationMode.sale);
    expect(restored.totalQuantity, 3);
    expect(restored.totalPrice, 486000);
    expect(restored.note, '메모');
    expect(restored.customerName, '김민수');
    expect(restored.revision, 1);
  });

  test('서버 시간이 확정되기 전에는 클라이언트 기록 시간을 사용한다', () {
    final recordedAt = DateTime.utc(2026, 11, 4);
    final json = QuoteRecord(
      id: 'quote',
      title: '견적',
      note: '',
      createdBy: 'staff',
      mode: CalculationMode.purchase,
      items: [snapshot(CalculationMode.purchase)],
      createdAt: recordedAt,
    ).toJson();
    json['createdAt'] = null;
    json['clientCreatedAt'] = Timestamp.fromDate(recordedAt);
    final restored = QuoteRecord.fromJson(json);
    expect(restored.createdAt, recordedAt);
    expect(restored.updatedAt, isNull);
  });

  test('고객명이 없는 이전 견적도 열고 고객명을 추가할 수 있다', () {
    final legacyJson = QuoteRecord(
      id: 'legacy',
      title: '기존 견적',
      note: '',
      createdBy: 'staff',
      mode: CalculationMode.purchase,
      items: [snapshot(CalculationMode.purchase)],
      createdAt: DateTime.utc(2026, 11, 4),
    ).toJson()..remove('customerName');
    final restored = QuoteRecord.fromJson(legacyJson);
    expect(restored.customerName, isEmpty);
    final updated = restored.copyWith(customerName: '김민수');
    expect(updated.toJson()['customerName'], '김민수');
    expect(updated.createdAt, restored.createdAt);
    expect(updated.totalPrice, restored.totalPrice);
  });

  test('신규 가격 계산은 잘못된 수량·가격·적용율을 거부한다', () {
    QuoteItem priced({
      int quantity = 1,
      double price = 10000,
      double rate = 0.7,
    }) => QuoteItem.priced(
      fishingRodId: 'rod',
      fishingRodName: '독야',
      brandName: '송원',
      length: 20,
      quantity: quantity,
      unitPrice: price,
      rate: rate,
      mode: CalculationMode.purchase,
    );
    expect(() => priced(quantity: 0), throwsArgumentError);
    expect(() => priced(price: -1), throwsArgumentError);
    expect(() => priced(price: double.infinity), throwsArgumentError);
    expect(() => priced(rate: double.nan), throwsArgumentError);
    expect(() => priced(rate: 1.01), throwsArgumentError);
  });
}
