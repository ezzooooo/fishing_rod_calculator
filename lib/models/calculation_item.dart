import 'package:freezed_annotation/freezed_annotation.dart';

part 'calculation_item.freezed.dart';
part 'calculation_item.g.dart';

enum CalculationPriceMode { purchase, sale }

@freezed
class CalculationItem with _$CalculationItem {
  const CalculationItem._();

  const factory CalculationItem({
    required String fishingRodId,
    required int length,
    required int quantity,
    required double discountRate, // 매입 적용율
    @Default(1.0) double saleRate, // 판매 적용율
  }) = _CalculationItem;

  factory CalculationItem.fromJson(Map<String, dynamic> json) =>
      _$CalculationItemFromJson(json);
}

extension CalculationItemExtension on CalculationItem {
  double _adjustedUnitPriceForMode(
    double unitPrice,
    CalculationPriceMode mode,
  ) {
    final appliedPrice = unitPrice * getRateForMode(mode);

    if (mode == CalculationPriceMode.purchase) {
      return (appliedPrice / 1000).floorToDouble() * 1000;
    }

    return (appliedPrice / 1000).ceilToDouble() * 1000;
  }

  double getRateForMode(CalculationPriceMode mode) {
    return mode == CalculationPriceMode.purchase ? discountRate : saleRate;
  }

  /// 할인 전 총 가격을 계산합니다.
  double getTotalPrice(double usedPrice) {
    return usedPrice * quantity;
  }

  /// 할인 후 최종 가격을 계산합니다.
  double getFinalPrice(double usedPrice) {
    final totalPrice = getTotalPrice(usedPrice);
    return totalPrice * discountRate;
  }

  double getAdjustedUnitPriceForMode(
    double unitPrice,
    CalculationPriceMode mode,
  ) {
    return _adjustedUnitPriceForMode(unitPrice, mode);
  }

  /// 모드별 적용율을 반영한 최종 가격을 계산합니다.
  double getFinalPriceForMode(double usedPrice, CalculationPriceMode mode) {
    final adjustedUnitPrice = _adjustedUnitPriceForMode(usedPrice, mode);
    return adjustedUnitPrice * quantity;
  }
}
