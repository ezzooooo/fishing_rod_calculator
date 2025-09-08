import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/calculation_item.dart';
import '../models/fishing_rod.dart';
import 'fishing_rod_provider.dart';

class CalculationNotifier extends StateNotifier<List<CalculationItem>> {
  CalculationNotifier() : super([]);

  void addCalculationItem({
    required String fishingRodId,
    required int length,
    required int quantity,
    double discountRate = 0.6, // 기본 60%
  }) {
    // 기존 항목이 있는지 확인
    final existingIndex = state.indexWhere(
      (item) => item.fishingRodId == fishingRodId && item.length == length,
    );

    if (existingIndex != -1) {
      // 기존 항목이 있으면 수량과 할인율 업데이트
      state = [
        ...state.sublist(0, existingIndex),
        state[existingIndex].copyWith(
          quantity: quantity,
          discountRate: discountRate,
        ),
        ...state.sublist(existingIndex + 1),
      ];
    } else {
      // 새 항목 추가
      final newItem = CalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: quantity,
        discountRate: discountRate,
      );
      state = [...state, newItem];
    }
  }

  void updateQuantity(String fishingRodId, int length, int quantity) {
    if (quantity <= 0) {
      removeCalculationItem(fishingRodId, length);
      return;
    }

    state = state.map((item) {
      if (item.fishingRodId == fishingRodId && item.length == length) {
        return item.copyWith(quantity: quantity);
      }
      return item;
    }).toList();
  }

  void updateDiscountRate(
    String fishingRodId,
    int length,
    double discountRate,
  ) {
    state = state.map((item) {
      if (item.fishingRodId == fishingRodId && item.length == length) {
        return item.copyWith(discountRate: discountRate);
      }
      return item;
    }).toList();
  }

  void removeCalculationItem(String fishingRodId, int length) {
    state = state
        .where(
          (item) =>
              !(item.fishingRodId == fishingRodId && item.length == length),
        )
        .toList();
  }

  void clearAll() {
    state = [];
  }

  CalculationItem? getCalculationItem(String fishingRodId, int length) {
    try {
      return state.firstWhere(
        (item) => item.fishingRodId == fishingRodId && item.length == length,
      );
    } catch (e) {
      return null;
    }
  }
}

final calculationProvider =
    StateNotifierProvider<CalculationNotifier, List<CalculationItem>>((ref) {
      return CalculationNotifier();
    });

// 총 대수를 계산하는 프로바이더
final totalQuantityProvider = Provider<int>((ref) {
  final calculations = ref.watch(calculationProvider);
  return calculations.fold(0, (sum, item) => sum + item.quantity);
});

// 총 원가를 계산하는 프로바이더
final totalOriginalPriceProvider = Provider<double>((ref) {
  final calculations = ref.watch(calculationProvider);
  final fishingRods = ref.watch(fishingRodProvider);

  double total = 0;
  for (final item in calculations) {
    final rod = fishingRods.firstWhere((rod) => rod.id == item.fishingRodId);
    final price = rod.getPriceForLength(item.length);
    total += item.getTotalPrice(price);
  }
  return total;
});

// 총 최종 가격을 계산하는 프로바이더
final totalFinalPriceProvider = Provider<double>((ref) {
  final calculations = ref.watch(calculationProvider);
  final fishingRods = ref.watch(fishingRodProvider);

  double total = 0;
  for (final item in calculations) {
    final rod = fishingRods.firstWhere((rod) => rod.id == item.fishingRodId);
    final price = rod.getPriceForLength(item.length);
    total += item.getFinalPrice(price);
  }
  return total;
});

// 특정 낚시대의 계산 항목들을 가져오는 프로바이더
final calculationItemsByRodProvider =
    Provider.family<List<CalculationItem>, String>((ref, fishingRodId) {
      final calculations = ref.watch(calculationProvider);
      return calculations
          .where((item) => item.fishingRodId == fishingRodId)
          .toList();
    });
