// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'fishing_rod.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$FishingRodImpl _$$FishingRodImplFromJson(Map<String, dynamic> json) =>
    _$FishingRodImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      brandId: json['brandId'] as String,
      minValue: (json['minValue'] as num).toInt(),
      maxValue: (json['maxValue'] as num).toInt(),
      usedPrice: (json['usedPrice'] as num).toDouble(),
      lengthPrices:
          (json['lengthPrices'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(int.parse(k), (e as num).toDouble()),
          ) ??
          const {},
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$FishingRodImplToJson(_$FishingRodImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'brandId': instance.brandId,
      'minValue': instance.minValue,
      'maxValue': instance.maxValue,
      'usedPrice': instance.usedPrice,
      'lengthPrices': instance.lengthPrices.map(
        (k, e) => MapEntry(k.toString(), e),
      ),
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };
