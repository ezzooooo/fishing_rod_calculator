import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/brand.dart';

const String _brandsKey = 'brands';
const _uuid = Uuid();

class BrandNotifier extends StateNotifier<List<Brand>> {
  BrandNotifier() : super([]) {
    _loadBrands();
  }

  Future<void> _loadBrands() async {
    final prefs = await SharedPreferences.getInstance();
    final brandsJson = prefs.getString(_brandsKey);

    if (brandsJson != null) {
      final List<dynamic> brandsList = jsonDecode(brandsJson);
      state = brandsList.map((json) => Brand.fromJson(json)).toList();
    }
  }

  Future<void> _saveBrands() async {
    final prefs = await SharedPreferences.getInstance();
    final brandsJson = jsonEncode(
      state.map((brand) => brand.toJson()).toList(),
    );
    await prefs.setString(_brandsKey, brandsJson);
  }

  Future<void> addBrand(String name) async {
    final newBrand = Brand(
      id: _uuid.v4(),
      name: name,
      createdAt: DateTime.now(),
    );

    state = [...state, newBrand];
    await _saveBrands();
  }

  Future<void> addBrandWithId(String id, String name) async {
    final newBrand = Brand(id: id, name: name, createdAt: DateTime.now());

    state = [...state, newBrand];
    await _saveBrands();
  }

  Future<void> updateBrand(String id, String name) async {
    state = state.map((brand) {
      if (brand.id == id) {
        return brand.copyWith(name: name, updatedAt: DateTime.now());
      }
      return brand;
    }).toList();

    await _saveBrands();
  }

  Future<void> deleteBrand(String id) async {
    state = state.where((brand) => brand.id != id).toList();
    await _saveBrands();
  }

  Brand? getBrandById(String id) {
    try {
      return state.firstWhere((brand) => brand.id == id);
    } catch (e) {
      return null;
    }
  }
}

final brandProvider = StateNotifierProvider<BrandNotifier, List<Brand>>((ref) {
  return BrandNotifier();
});

// 브랜드를 ID로 찾는 프로바이더
final brandByIdProvider = Provider.family<Brand?, String>((ref, id) {
  final brands = ref.watch(brandProvider);
  try {
    return brands.firstWhere((brand) => brand.id == id);
  } catch (e) {
    return null;
  }
});
