// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'fishing_rod.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

FishingRod _$FishingRodFromJson(Map<String, dynamic> json) {
  return _FishingRod.fromJson(json);
}

/// @nodoc
mixin _$FishingRod {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get brandId => throw _privateConstructorUsedError;
  int get minValue => throw _privateConstructorUsedError;
  int get maxValue => throw _privateConstructorUsedError;
  double get usedPrice => throw _privateConstructorUsedError;
  Map<int, double> get lengthPrices =>
      throw _privateConstructorUsedError; // 칸수별 가격 {길이: 가격}
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  /// Serializes this FishingRod to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of FishingRod
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FishingRodCopyWith<FishingRod> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FishingRodCopyWith<$Res> {
  factory $FishingRodCopyWith(
    FishingRod value,
    $Res Function(FishingRod) then,
  ) = _$FishingRodCopyWithImpl<$Res, FishingRod>;
  @useResult
  $Res call({
    String id,
    String name,
    String brandId,
    int minValue,
    int maxValue,
    double usedPrice,
    Map<int, double> lengthPrices,
    DateTime? createdAt,
    DateTime? updatedAt,
  });
}

/// @nodoc
class _$FishingRodCopyWithImpl<$Res, $Val extends FishingRod>
    implements $FishingRodCopyWith<$Res> {
  _$FishingRodCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FishingRod
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? brandId = null,
    Object? minValue = null,
    Object? maxValue = null,
    Object? usedPrice = null,
    Object? lengthPrices = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            name: null == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
                      as String,
            brandId: null == brandId
                ? _value.brandId
                : brandId // ignore: cast_nullable_to_non_nullable
                      as String,
            minValue: null == minValue
                ? _value.minValue
                : minValue // ignore: cast_nullable_to_non_nullable
                      as int,
            maxValue: null == maxValue
                ? _value.maxValue
                : maxValue // ignore: cast_nullable_to_non_nullable
                      as int,
            usedPrice: null == usedPrice
                ? _value.usedPrice
                : usedPrice // ignore: cast_nullable_to_non_nullable
                      as double,
            lengthPrices: null == lengthPrices
                ? _value.lengthPrices
                : lengthPrices // ignore: cast_nullable_to_non_nullable
                      as Map<int, double>,
            createdAt: freezed == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            updatedAt: freezed == updatedAt
                ? _value.updatedAt
                : updatedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$FishingRodImplCopyWith<$Res>
    implements $FishingRodCopyWith<$Res> {
  factory _$$FishingRodImplCopyWith(
    _$FishingRodImpl value,
    $Res Function(_$FishingRodImpl) then,
  ) = __$$FishingRodImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String name,
    String brandId,
    int minValue,
    int maxValue,
    double usedPrice,
    Map<int, double> lengthPrices,
    DateTime? createdAt,
    DateTime? updatedAt,
  });
}

/// @nodoc
class __$$FishingRodImplCopyWithImpl<$Res>
    extends _$FishingRodCopyWithImpl<$Res, _$FishingRodImpl>
    implements _$$FishingRodImplCopyWith<$Res> {
  __$$FishingRodImplCopyWithImpl(
    _$FishingRodImpl _value,
    $Res Function(_$FishingRodImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FishingRod
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? brandId = null,
    Object? minValue = null,
    Object? maxValue = null,
    Object? usedPrice = null,
    Object? lengthPrices = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(
      _$FishingRodImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        name: null == name
            ? _value.name
            : name // ignore: cast_nullable_to_non_nullable
                  as String,
        brandId: null == brandId
            ? _value.brandId
            : brandId // ignore: cast_nullable_to_non_nullable
                  as String,
        minValue: null == minValue
            ? _value.minValue
            : minValue // ignore: cast_nullable_to_non_nullable
                  as int,
        maxValue: null == maxValue
            ? _value.maxValue
            : maxValue // ignore: cast_nullable_to_non_nullable
                  as int,
        usedPrice: null == usedPrice
            ? _value.usedPrice
            : usedPrice // ignore: cast_nullable_to_non_nullable
                  as double,
        lengthPrices: null == lengthPrices
            ? _value._lengthPrices
            : lengthPrices // ignore: cast_nullable_to_non_nullable
                  as Map<int, double>,
        createdAt: freezed == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        updatedAt: freezed == updatedAt
            ? _value.updatedAt
            : updatedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$FishingRodImpl extends _FishingRod {
  const _$FishingRodImpl({
    required this.id,
    required this.name,
    required this.brandId,
    required this.minValue,
    required this.maxValue,
    required this.usedPrice,
    final Map<int, double> lengthPrices = const {},
    this.createdAt,
    this.updatedAt,
  }) : _lengthPrices = lengthPrices,
       super._();

  factory _$FishingRodImpl.fromJson(Map<String, dynamic> json) =>
      _$$FishingRodImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String brandId;
  @override
  final int minValue;
  @override
  final int maxValue;
  @override
  final double usedPrice;
  final Map<int, double> _lengthPrices;
  @override
  @JsonKey()
  Map<int, double> get lengthPrices {
    if (_lengthPrices is EqualUnmodifiableMapView) return _lengthPrices;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_lengthPrices);
  }

  // 칸수별 가격 {길이: 가격}
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'FishingRod(id: $id, name: $name, brandId: $brandId, minValue: $minValue, maxValue: $maxValue, usedPrice: $usedPrice, lengthPrices: $lengthPrices, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FishingRodImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.brandId, brandId) || other.brandId == brandId) &&
            (identical(other.minValue, minValue) ||
                other.minValue == minValue) &&
            (identical(other.maxValue, maxValue) ||
                other.maxValue == maxValue) &&
            (identical(other.usedPrice, usedPrice) ||
                other.usedPrice == usedPrice) &&
            const DeepCollectionEquality().equals(
              other._lengthPrices,
              _lengthPrices,
            ) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    name,
    brandId,
    minValue,
    maxValue,
    usedPrice,
    const DeepCollectionEquality().hash(_lengthPrices),
    createdAt,
    updatedAt,
  );

  /// Create a copy of FishingRod
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FishingRodImplCopyWith<_$FishingRodImpl> get copyWith =>
      __$$FishingRodImplCopyWithImpl<_$FishingRodImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FishingRodImplToJson(this);
  }
}

abstract class _FishingRod extends FishingRod {
  const factory _FishingRod({
    required final String id,
    required final String name,
    required final String brandId,
    required final int minValue,
    required final int maxValue,
    required final double usedPrice,
    final Map<int, double> lengthPrices,
    final DateTime? createdAt,
    final DateTime? updatedAt,
  }) = _$FishingRodImpl;
  const _FishingRod._() : super._();

  factory _FishingRod.fromJson(Map<String, dynamic> json) =
      _$FishingRodImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get brandId;
  @override
  int get minValue;
  @override
  int get maxValue;
  @override
  double get usedPrice;
  @override
  Map<int, double> get lengthPrices; // 칸수별 가격 {길이: 가격}
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;

  /// Create a copy of FishingRod
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FishingRodImplCopyWith<_$FishingRodImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
