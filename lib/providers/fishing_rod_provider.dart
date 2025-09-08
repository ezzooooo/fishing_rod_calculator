import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/fishing_rod.dart';

const String _fishingRodsKey = 'fishing_rods';
const _uuid = Uuid();

class FishingRodNotifier extends StateNotifier<List<FishingRod>> {
  FishingRodNotifier() : super([]) {
    _loadFishingRods();
  }

  Future<void> _loadFishingRods() async {
    final prefs = await SharedPreferences.getInstance();
    final fishingRodsJson = prefs.getString(_fishingRodsKey);

    if (fishingRodsJson != null) {
      final List<dynamic> fishingRodsList = jsonDecode(fishingRodsJson);
      state = fishingRodsList.map((json) => FishingRod.fromJson(json)).toList();
    }
  }

  Future<void> _saveFishingRods() async {
    final prefs = await SharedPreferences.getInstance();
    final fishingRodsJson = jsonEncode(
      state.map((rod) => rod.toJson()).toList(),
    );
    await prefs.setString(_fishingRodsKey, fishingRodsJson);
  }

  Future<void> addFishingRod({
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    Map<int, double>? lengthPrices,
  }) async {
    final newFishingRod = FishingRod(
      id: _uuid.v4(),
      name: name,
      brandId: brandId,
      minValue: minValue,
      maxValue: maxValue,
      usedPrice: usedPrice,
      lengthPrices: lengthPrices ?? {},
      createdAt: DateTime.now(),
    );

    state = [...state, newFishingRod];
    await _saveFishingRods();
  }

  Future<void> updateFishingRod({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required double usedPrice,
    Map<int, double>? lengthPrices,
  }) async {
    state = state.map((rod) {
      if (rod.id == id) {
        return rod.copyWith(
          name: name,
          brandId: brandId,
          minValue: minValue,
          maxValue: maxValue,
          usedPrice: usedPrice,
          lengthPrices: lengthPrices ?? rod.lengthPrices,
          updatedAt: DateTime.now(),
        );
      }
      return rod;
    }).toList();

    await _saveFishingRods();
  }

  Future<void> deleteFishingRod(String id) async {
    state = state.where((rod) => rod.id != id).toList();
    await _saveFishingRods();
  }

  FishingRod? getFishingRodById(String id) {
    try {
      return state.firstWhere((rod) => rod.id == id);
    } catch (e) {
      return null;
    }
  }

  List<FishingRod> getFishingRodsByBrand(String brandId) {
    return state.where((rod) => rod.brandId == brandId).toList();
  }

  List<FishingRod> searchFishingRods(String query) {
    if (query.isEmpty) return state;

    final lowercaseQuery = query.toLowerCase();
    return state.where((rod) {
      return rod.name.toLowerCase().contains(lowercaseQuery);
    }).toList();
  }
}

final fishingRodProvider =
    StateNotifierProvider<FishingRodNotifier, List<FishingRod>>((ref) {
      return FishingRodNotifier();
    });

// 낚시대를 ID로 찾는 프로바이더
final fishingRodByIdProvider = Provider.family<FishingRod?, String>((ref, id) {
  final fishingRods = ref.watch(fishingRodProvider);
  try {
    return fishingRods.firstWhere((rod) => rod.id == id);
  } catch (e) {
    return null;
  }
});

// 브랜드별 낚시대 목록을 가져오는 프로바이더
final fishingRodsByBrandProvider = Provider.family<List<FishingRod>, String>((
  ref,
  brandId,
) {
  final fishingRods = ref.watch(fishingRodProvider);
  return fishingRods.where((rod) => rod.brandId == brandId).toList();
});
