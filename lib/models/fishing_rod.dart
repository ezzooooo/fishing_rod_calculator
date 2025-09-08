import 'package:freezed_annotation/freezed_annotation.dart';

part 'fishing_rod.freezed.dart';
part 'fishing_rod.g.dart';

@freezed
class FishingRod with _$FishingRod {
  const FishingRod._();

  const factory FishingRod({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    @Default({}) Map<int, double> lengthPrices, // 칸수별 가격 {길이: 가격}
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _FishingRod;

  factory FishingRod.fromJson(Map<String, dynamic> json) =>
      _$FishingRodFromJson(json);
}

extension FishingRodExtension on FishingRod {
  /// 낚시대의 칸수 목록을 생성합니다.
  /// lengthPrices에 있는 칸수들을 반환하거나, 없으면 기존 방식으로 생성
  List<int> get availableLengths {
    if (lengthPrices.isNotEmpty) {
      return lengthPrices.keys.toList()..sort();
    }

    // 기존 방식 (하위 호환성)
    final List<int> lengths = [];
    for (int i = minValue; i <= maxValue; i += 2) {
      lengths.add(i);
    }
    return lengths;
  }

  /// 특정 칸수의 가격을 가져옵니다.
  double getPriceForLength(int length) {
    return lengthPrices[length] ?? usedPrice;
  }
}
