import 'package:freezed_annotation/freezed_annotation.dart';

part 'brand.freezed.dart';
part 'brand.g.dart';

@freezed
class Brand with _$Brand {
  const Brand._();

  const factory Brand({
    required String id,
    required String name,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Brand;

  factory Brand.fromJson(Map<String, dynamic> json) => _$BrandFromJson(json);
}
