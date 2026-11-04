import 'package:cloud_firestore/cloud_firestore.dart';

import '../providers/calculation_provider.dart';
import 'calculation_item.dart';
import 'fishing_rod.dart';

/// Names and prices are snapshots, independent of the current rod catalogue.
class QuoteItem {
  const QuoteItem({
    required this.fishingRodId,
    required this.fishingRodName,
    required this.brandName,
    required this.length,
    required this.quantity,
    required this.unitPrice,
    required this.rate,
    required this.finalUnitPrice,
  });

  final String fishingRodId;
  final String fishingRodName;
  final String brandName;
  final int length;
  final int quantity;
  final double unitPrice;
  final double rate;
  final double finalUnitPrice;

  double get totalPrice => finalUnitPrice * quantity;

  factory QuoteItem.fromCalculation({
    required CalculationItem calculation,
    required FishingRod rod,
    required String brandName,
    required CalculationMode mode,
  }) {
    return QuoteItem.priced(
      fishingRodId: rod.id,
      fishingRodName: rod.name,
      brandName: brandName,
      length: calculation.length,
      quantity: calculation.quantity,
      unitPrice: mode == CalculationMode.purchase
          ? rod.getPurchasePriceForLength(calculation.length)
          : rod.getSalePriceForLength(calculation.length),
      rate: calculation.getRateForMode(
        mode == CalculationMode.purchase
            ? CalculationPriceMode.purchase
            : CalculationPriceMode.sale,
      ),
      mode: mode,
    );
  }

  factory QuoteItem.priced({
    required String fishingRodId,
    required String fishingRodName,
    required String brandName,
    required int length,
    required int quantity,
    required double unitPrice,
    required double rate,
    required CalculationMode mode,
  }) {
    if (length <= 0 ||
        quantity <= 0 ||
        !unitPrice.isFinite ||
        unitPrice < 0 ||
        !rate.isFinite ||
        rate < 0 ||
        rate > 1) {
      throw ArgumentError('칸수와 수량은 1 이상, 가격은 0 이상, 적용율은 0~100%여야 합니다.');
    }
    final calculation = CalculationItem(
      fishingRodId: fishingRodId,
      length: length,
      quantity: quantity,
      discountRate: rate,
      saleRate: rate,
    );
    return QuoteItem(
      fishingRodId: fishingRodId,
      fishingRodName: fishingRodName,
      brandName: brandName,
      length: length,
      quantity: quantity,
      unitPrice: unitPrice,
      rate: rate,
      finalUnitPrice: calculation.getAdjustedUnitPriceForMode(
        unitPrice,
        mode == CalculationMode.purchase
            ? CalculationPriceMode.purchase
            : CalculationPriceMode.sale,
      ),
    );
  }

  QuoteItem copyWith({
    String? fishingRodId,
    String? fishingRodName,
    String? brandName,
    int? length,
    int? quantity,
    double? unitPrice,
    double? rate,
    double? finalUnitPrice,
  }) => QuoteItem(
    fishingRodId: fishingRodId ?? this.fishingRodId,
    fishingRodName: fishingRodName ?? this.fishingRodName,
    brandName: brandName ?? this.brandName,
    length: length ?? this.length,
    quantity: quantity ?? this.quantity,
    unitPrice: unitPrice ?? this.unitPrice,
    rate: rate ?? this.rate,
    finalUnitPrice: finalUnitPrice ?? this.finalUnitPrice,
  );

  factory QuoteItem.fromJson(Map<String, dynamic> json) => QuoteItem(
    fishingRodId: json['fishingRodId'] as String,
    fishingRodName: json['fishingRodName'] as String,
    brandName: json['brandName'] as String? ?? '',
    length: (json['length'] as num).toInt(),
    quantity: (json['quantity'] as num).toInt(),
    unitPrice: (json['unitPrice'] as num).toDouble(),
    rate: (json['rate'] as num).toDouble(),
    finalUnitPrice: (json['finalUnitPrice'] as num).toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'fishingRodId': fishingRodId,
    'fishingRodName': fishingRodName,
    'brandName': brandName,
    'length': length,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'rate': rate,
    'finalUnitPrice': finalUnitPrice,
  };
}

class QuoteRecord {
  QuoteRecord({
    required this.id,
    required this.title,
    required this.note,
    required this.createdBy,
    required this.mode,
    required List<QuoteItem> items,
    required this.createdAt,
    this.customerName = '',
    this.updatedAt,
    this.revision = 0,
  }) : items = List.unmodifiable(items);

  final String id;
  final String title;
  final String note;
  final String customerName;
  final String createdBy;
  final CalculationMode mode;
  final List<QuoteItem> items;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int revision;

  int get totalQuantity =>
      items.fold(0, (total, item) => total + item.quantity);
  double get totalPrice =>
      items.fold(0, (total, item) => total + item.totalPrice);

  QuoteRecord copyWith({
    String? id,
    String? title,
    String? note,
    String? customerName,
    String? createdBy,
    CalculationMode? mode,
    List<QuoteItem>? items,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? revision,
  }) => QuoteRecord(
    id: id ?? this.id,
    title: title ?? this.title,
    note: note ?? this.note,
    customerName: customerName ?? this.customerName,
    createdBy: createdBy ?? this.createdBy,
    mode: mode ?? this.mode,
    items: items ?? this.items,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    revision: revision ?? this.revision,
  );

  factory QuoteRecord.fromJson(Map<String, dynamic> json) => QuoteRecord(
    id: json['id'] as String,
    title: json['title'] as String,
    note: json['note'] as String? ?? '',
    customerName: json['customerName'] as String? ?? '',
    createdBy: json['createdBy'] as String,
    mode: CalculationMode.values.byName(json['mode'] as String),
    items: (json['items'] as List)
        .map(
          (item) => QuoteItem.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList(),
    createdAt: _dateFromJson(json['createdAt'] ?? json['clientCreatedAt'])!,
    updatedAt: _dateFromJson(json['updatedAt'] ?? json['clientUpdatedAt']),
    revision: (json['revision'] as num?)?.toInt() ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'note': note,
    'customerName': customerName,
    'createdBy': createdBy,
    'mode': mode.name,
    'items': items.map((item) => item.toJson()).toList(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
    'revision': revision,
    'totalQuantity': totalQuantity,
    'totalPrice': totalPrice,
  };
}

DateTime? _dateFromJson(dynamic value) {
  if (value == null) return null;
  if (value is Timestamp) return value.toDate().toUtc();
  if (value is DateTime) return value.toUtc();
  return DateTime.parse(value as String).toUtc();
}
