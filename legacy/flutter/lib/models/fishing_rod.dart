import 'package:freezed_annotation/freezed_annotation.dart';

part 'fishing_rod.freezed.dart';
part 'fishing_rod.g.dart';

Map<String, dynamic> _normalizeFishingRodJson(Map<String, dynamic> json) {
  final normalized = Map<String, dynamic>.from(json);
  final legacyLengthPrices = _normalizePriceMap(json['lengthPrices']);
  final purchaseLengthPrices = _normalizePriceMap(
    json['purchaseLengthPrices'] ?? json['purchasePrices'],
  );
  final saleLengthPrices = _normalizePriceMap(
    json['saleLengthPrices'] ?? json['salePrices'],
  );

  final resolvedPurchaseLengthPrices = purchaseLengthPrices.isNotEmpty
      ? purchaseLengthPrices
      : legacyLengthPrices;
  final resolvedSaleLengthPrices = saleLengthPrices.isNotEmpty
      ? saleLengthPrices
      : (legacyLengthPrices.isNotEmpty
            ? legacyLengthPrices
            : resolvedPurchaseLengthPrices);

  normalized['lengthPrices'] = _stringifyPriceMap(
    legacyLengthPrices.isNotEmpty
        ? legacyLengthPrices
        : resolvedSaleLengthPrices,
  );
  normalized['purchaseLengthPrices'] = _stringifyPriceMap(
    resolvedPurchaseLengthPrices,
  );
  normalized['saleLengthPrices'] = _stringifyPriceMap(resolvedSaleLengthPrices);
  normalized['usedPrice'] =
      (json['usedPrice'] as num?)?.toDouble() ??
      _averagePrice(
        resolvedSaleLengthPrices.isNotEmpty
            ? resolvedSaleLengthPrices
            : resolvedPurchaseLengthPrices,
      );

  return normalized;
}

Map<String, double> _stringifyPriceMap(Map<int, double> prices) {
  return Map<String, double>.from(
    prices.map((key, value) => MapEntry(key.toString(), value)),
  );
}

Map<int, double> _normalizePriceMap(dynamic rawPrices) {
  final prices = <int, double>{};
  if (rawPrices is! Map) {
    return prices;
  }

  for (final entry in rawPrices.entries) {
    final length = int.tryParse(entry.key.toString());
    final value = entry.value;
    final price = value is num ? value.toDouble() : double.tryParse('$value');
    if (length != null && price != null) {
      prices[length] = price;
    }
  }

  return prices;
}

double _averagePrice(Map<int, double> prices) {
  if (prices.isEmpty) {
    return 0.0;
  }

  final total = prices.values.reduce((a, b) => a + b);
  return total / prices.length;
}

@freezed
class FishingRod with _$FishingRod {
  const FishingRod._();

  const factory FishingRod({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice, // 레거시 판매가 평균값
    @Default({}) Map<int, double> lengthPrices, // 레거시 칸수별 판매가
    @Default({}) Map<int, double> purchaseLengthPrices, // 칸수별 매입가
    @Default({}) Map<int, double> saleLengthPrices, // 칸수별 판매가
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _FishingRod;

  factory FishingRod.fromJson(Map<String, dynamic> json) =>
      _$FishingRodFromJson(_normalizeFishingRodJson(json));
}

extension FishingRodExtension on FishingRod {
  /// 낚시대의 칸수 목록을 생성합니다.
  /// 가격이 설정된 칸수들을 반환하거나, 없으면 기존 방식으로 생성
  List<int> get availableLengths {
    final lengths = <int>{
      ...lengthPrices.keys,
      ...purchaseLengthPrices.keys,
      ...saleLengthPrices.keys,
    };

    if (lengths.isNotEmpty) {
      return lengths.toList()..sort();
    }

    // 기존 방식 (하위 호환성)
    final List<int> generatedLengths = [];
    for (int i = minValue; i <= maxValue; i += 2) {
      generatedLengths.add(i);
    }
    return generatedLengths;
  }

  /// 특정 칸수의 매입가를 가져옵니다.
  double getPurchasePriceForLength(int length) {
    return purchaseLengthPrices[length] ??
        lengthPrices[length] ??
        saleLengthPrices[length] ??
        usedPrice;
  }

  /// 특정 칸수의 판매가를 가져옵니다.
  double getSalePriceForLength(int length) {
    return saleLengthPrices[length] ??
        lengthPrices[length] ??
        purchaseLengthPrices[length] ??
        usedPrice;
  }

  /// 기존 계산 로직과의 호환을 위해 판매가를 반환합니다.
  double getPriceForLength(int length) {
    return getSalePriceForLength(length);
  }
}
