import '../providers/calculation_provider.dart';
import 'calculation_item.dart';
import 'fishing_rod.dart';
import 'quote_record.dart';

/// A rod and its prices as they were when it was added to the draft.
class QuoteDraftRod {
  QuoteDraftRod({
    required this.rod,
    required this.brandName,
    required List<CalculationItem> calculations,
  }) : calculations = List.unmodifiable(calculations);

  final FishingRod rod;
  final String brandName;
  final List<CalculationItem> calculations;

  String get fishingRodId => rod.id;

  List<QuoteItem> itemsForMode(CalculationMode mode) => List.unmodifiable([
    for (final calculation in calculations)
      if (calculation.quantity > 0)
        QuoteItem.fromCalculation(
          calculation: calculation,
          rod: rod,
          brandName: brandName,
          mode: mode,
        ),
  ]);
}

class QuoteDraft {
  QuoteDraft({
    this.customerName = '',
    this.note = '',
    this.mode = CalculationMode.purchase,
    List<QuoteDraftRod> rods = const [],
  }) : rods = List.unmodifiable(rods);

  final String customerName;
  final String note;
  final CalculationMode mode;
  final List<QuoteDraftRod> rods;

  List<QuoteItem> get items =>
      List.unmodifiable([for (final rod in rods) ...rod.itemsForMode(mode)]);

  int get rodCount => rods.length;
  int get totalQuantity =>
      items.fold(0, (total, item) => total + item.quantity);
  double get totalPrice =>
      items.fold(0, (total, item) => total + item.totalPrice);
  double get totalOriginalPrice =>
      items.fold(0, (total, item) => total + item.unitPrice * item.quantity);
  bool get hasContent =>
      customerName.trim().isNotEmpty ||
      note.trim().isNotEmpty ||
      rods.isNotEmpty;

  QuoteDraft copyWith({
    String? customerName,
    String? note,
    CalculationMode? mode,
    List<QuoteDraftRod>? rods,
  }) => QuoteDraft(
    customerName: customerName ?? this.customerName,
    note: note ?? this.note,
    mode: mode ?? this.mode,
    rods: rods ?? this.rods,
  );
}
