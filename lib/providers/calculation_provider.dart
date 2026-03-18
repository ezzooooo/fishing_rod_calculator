import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/calculation_item.dart';
import '../models/fishing_rod.dart';
import 'fishing_rod_provider.dart';

enum CalculationMode { purchase, sale }

extension CalculationModeExtension on CalculationMode {
  String get label => this == CalculationMode.purchase ? '매입' : '판매';

  String get priceLabel => this == CalculationMode.purchase ? '매입가' : '판매가';

  String get totalPriceLabel =>
      this == CalculationMode.purchase ? '총 매입가' : '총 판매가';

  String get finalPriceLabel =>
      this == CalculationMode.purchase ? '최종 매입가' : '최종 판매가';
}

class CalculationNotifier extends StateNotifier<List<CalculationItem>> {
  CalculationNotifier() : super([]);

  void addCalculationItem({
    required String fishingRodId,
    required int length,
    required int quantity,
    double? discountRate,
    double? saleRate,
  }) {
    // 기존 항목이 있는지 확인
    final existingIndex = state.indexWhere(
      (item) => item.fishingRodId == fishingRodId && item.length == length,
    );

    final resolvedPurchaseRate = discountRate ?? 0.7;
    final resolvedSaleRate = saleRate ?? 1.0;

    if (existingIndex != -1) {
      final existingItem = state[existingIndex];

      // 기존 항목이 있으면 수량과 할인율 업데이트
      state = [
        ...state.sublist(0, existingIndex),
        existingItem.copyWith(
          quantity: quantity,
          discountRate: discountRate ?? existingItem.discountRate,
          saleRate: saleRate ?? existingItem.saleRate,
        ),
        ...state.sublist(existingIndex + 1),
      ];
    } else {
      // 새 항목 추가
      final newItem = CalculationItem(
        fishingRodId: fishingRodId,
        length: length,
        quantity: quantity,
        discountRate: resolvedPurchaseRate,
        saleRate: resolvedSaleRate,
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
    double discountRate, {
    CalculationMode mode = CalculationMode.purchase,
  }) {
    state = state.map((item) {
      if (item.fishingRodId == fishingRodId && item.length == length) {
        return mode == CalculationMode.purchase
            ? item.copyWith(discountRate: discountRate)
            : item.copyWith(saleRate: discountRate);
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

final calculationModeProvider = StateProvider<CalculationMode>((ref) {
  return CalculationMode.purchase;
});

double _priceForMode(FishingRod rod, int length, CalculationMode mode) {
  return mode == CalculationMode.purchase
      ? rod.getPurchasePriceForLength(length)
      : rod.getSalePriceForLength(length);
}

// 총 대수를 계산하는 프로바이더
final totalQuantityProvider = Provider<int>((ref) {
  final calculations = ref.watch(calculationProvider);
  return calculations.fold(0, (sum, item) => sum + item.quantity);
});

// 총 원가를 계산하는 프로바이더
final totalOriginalPriceProvider = Provider<double>((ref) {
  final calculations = ref.watch(calculationProvider);
  final fishingRods = ref.watch(fishingRodProvider);
  final mode = ref.watch(calculationModeProvider);

  double total = 0;
  for (final item in calculations) {
    final rod = fishingRods.firstWhere((rod) => rod.id == item.fishingRodId);
    final price = _priceForMode(rod, item.length, mode);
    total += item.getTotalPrice(price);
  }
  return total;
});

// 총 최종 가격을 계산하는 프로바이더
final totalFinalPriceProvider = Provider<double>((ref) {
  final calculations = ref.watch(calculationProvider);
  final fishingRods = ref.watch(fishingRodProvider);
  final mode = ref.watch(calculationModeProvider);

  double total = 0;
  for (final item in calculations) {
    final rod = fishingRods.firstWhere((rod) => rod.id == item.fishingRodId);
    final price = _priceForMode(rod, item.length, mode);
    total += item.getFinalPriceForMode(
      price,
      mode == CalculationMode.purchase
          ? CalculationPriceMode.purchase
          : CalculationPriceMode.sale,
    );
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
