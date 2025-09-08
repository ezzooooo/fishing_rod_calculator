// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'calculation_item.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

CalculationItem _$CalculationItemFromJson(Map<String, dynamic> json) {
  return _CalculationItem.fromJson(json);
}

/// @nodoc
mixin _$CalculationItem {
  String get fishingRodId => throw _privateConstructorUsedError;
  int get length => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  double get discountRate => throw _privateConstructorUsedError;

  /// Serializes this CalculationItem to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CalculationItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CalculationItemCopyWith<CalculationItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CalculationItemCopyWith<$Res> {
  factory $CalculationItemCopyWith(
    CalculationItem value,
    $Res Function(CalculationItem) then,
  ) = _$CalculationItemCopyWithImpl<$Res, CalculationItem>;
  @useResult
  $Res call({
    String fishingRodId,
    int length,
    int quantity,
    double discountRate,
  });
}

/// @nodoc
class _$CalculationItemCopyWithImpl<$Res, $Val extends CalculationItem>
    implements $CalculationItemCopyWith<$Res> {
  _$CalculationItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CalculationItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? fishingRodId = null,
    Object? length = null,
    Object? quantity = null,
    Object? discountRate = null,
  }) {
    return _then(
      _value.copyWith(
            fishingRodId: null == fishingRodId
                ? _value.fishingRodId
                : fishingRodId // ignore: cast_nullable_to_non_nullable
                      as String,
            length: null == length
                ? _value.length
                : length // ignore: cast_nullable_to_non_nullable
                      as int,
            quantity: null == quantity
                ? _value.quantity
                : quantity // ignore: cast_nullable_to_non_nullable
                      as int,
            discountRate: null == discountRate
                ? _value.discountRate
                : discountRate // ignore: cast_nullable_to_non_nullable
                      as double,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CalculationItemImplCopyWith<$Res>
    implements $CalculationItemCopyWith<$Res> {
  factory _$$CalculationItemImplCopyWith(
    _$CalculationItemImpl value,
    $Res Function(_$CalculationItemImpl) then,
  ) = __$$CalculationItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String fishingRodId,
    int length,
    int quantity,
    double discountRate,
  });
}

/// @nodoc
class __$$CalculationItemImplCopyWithImpl<$Res>
    extends _$CalculationItemCopyWithImpl<$Res, _$CalculationItemImpl>
    implements _$$CalculationItemImplCopyWith<$Res> {
  __$$CalculationItemImplCopyWithImpl(
    _$CalculationItemImpl _value,
    $Res Function(_$CalculationItemImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CalculationItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? fishingRodId = null,
    Object? length = null,
    Object? quantity = null,
    Object? discountRate = null,
  }) {
    return _then(
      _$CalculationItemImpl(
        fishingRodId: null == fishingRodId
            ? _value.fishingRodId
            : fishingRodId // ignore: cast_nullable_to_non_nullable
                  as String,
        length: null == length
            ? _value.length
            : length // ignore: cast_nullable_to_non_nullable
                  as int,
        quantity: null == quantity
            ? _value.quantity
            : quantity // ignore: cast_nullable_to_non_nullable
                  as int,
        discountRate: null == discountRate
            ? _value.discountRate
            : discountRate // ignore: cast_nullable_to_non_nullable
                  as double,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$CalculationItemImpl extends _CalculationItem {
  const _$CalculationItemImpl({
    required this.fishingRodId,
    required this.length,
    required this.quantity,
    required this.discountRate,
  }) : super._();

  factory _$CalculationItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$CalculationItemImplFromJson(json);

  @override
  final String fishingRodId;
  @override
  final int length;
  @override
  final int quantity;
  @override
  final double discountRate;

  @override
  String toString() {
    return 'CalculationItem(fishingRodId: $fishingRodId, length: $length, quantity: $quantity, discountRate: $discountRate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CalculationItemImpl &&
            (identical(other.fishingRodId, fishingRodId) ||
                other.fishingRodId == fishingRodId) &&
            (identical(other.length, length) || other.length == length) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.discountRate, discountRate) ||
                other.discountRate == discountRate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, fishingRodId, length, quantity, discountRate);

  /// Create a copy of CalculationItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CalculationItemImplCopyWith<_$CalculationItemImpl> get copyWith =>
      __$$CalculationItemImplCopyWithImpl<_$CalculationItemImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$CalculationItemImplToJson(this);
  }
}

abstract class _CalculationItem extends CalculationItem {
  const factory _CalculationItem({
    required final String fishingRodId,
    required final int length,
    required final int quantity,
    required final double discountRate,
  }) = _$CalculationItemImpl;
  const _CalculationItem._() : super._();

  factory _CalculationItem.fromJson(Map<String, dynamic> json) =
      _$CalculationItemImpl.fromJson;

  @override
  String get fishingRodId;
  @override
  int get length;
  @override
  int get quantity;
  @override
  double get discountRate;

  /// Create a copy of CalculationItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CalculationItemImplCopyWith<_$CalculationItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
