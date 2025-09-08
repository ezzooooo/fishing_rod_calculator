import 'package:freezed_annotation/freezed_annotation.dart';

part 'calculation_item.freezed.dart';
part 'calculation_item.g.dart';

@freezed
class CalculationItem with _$CalculationItem {
  const CalculationItem._();

  const factory CalculationItem({
    required String fishingRodId,
    required int length,
    required int quantity,
    required double discountRate, // 0.4 ~ 0.7 (40% ~ 70%)
  }) = _CalculationItem;

  factory CalculationItem.fromJson(Map<String, dynamic> json) =>
      _$CalculationItemFromJson(json);
}

extension CalculationItemExtension on CalculationItem {
  /// 할인 전 총 가격을 계산합니다.
  double getTotalPrice(double usedPrice) {
    return usedPrice * quantity;
  }

  /// 할인 후 최종 가격을 계산합니다.
  double getFinalPrice(double usedPrice) {
    final totalPrice = getTotalPrice(usedPrice);
    return totalPrice * discountRate;
  }
}
