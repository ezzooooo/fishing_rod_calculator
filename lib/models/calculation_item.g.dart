// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'calculation_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CalculationItemImpl _$$CalculationItemImplFromJson(
  Map<String, dynamic> json,
) => _$CalculationItemImpl(
  fishingRodId: json['fishingRodId'] as String,
  length: (json['length'] as num).toInt(),
  quantity: (json['quantity'] as num).toInt(),
  discountRate: (json['discountRate'] as num).toDouble(),
);

Map<String, dynamic> _$$CalculationItemImplToJson(
  _$CalculationItemImpl instance,
) => <String, dynamic>{
  'fishingRodId': instance.fishingRodId,
  'length': instance.length,
  'quantity': instance.quantity,
  'discountRate': instance.discountRate,
};
