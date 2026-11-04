import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/quote_draft.dart';
import 'calculation_provider.dart';

class QuoteDraftNotifier extends StateNotifier<QuoteDraft> {
  QuoteDraftNotifier() : super(QuoteDraft());

  void setCustomerName(String value) {
    state = state.copyWith(customerName: value);
  }

  void setNote(String value) {
    state = state.copyWith(note: value);
  }

  void setMode(CalculationMode value) {
    state = state.copyWith(mode: value);
  }

  void upsertRod(QuoteDraftRod value) {
    final calculations = value.calculations
        .where((calculation) => calculation.quantity > 0)
        .map((calculation) => calculation.copyWith(fishingRodId: value.rod.id))
        .toList();
    if (calculations.isEmpty) {
      removeRod(value.fishingRodId);
      return;
    }
    final updated = QuoteDraftRod(
      rod: value.rod,
      brandName: value.brandName,
      calculations: calculations,
    );
    final index = state.rods.indexWhere(
      (rod) => rod.fishingRodId == value.fishingRodId,
    );
    final rods = [...state.rods];
    if (index < 0) {
      rods.add(updated);
    } else {
      rods[index] = updated;
    }
    state = state.copyWith(rods: rods);
  }

  void removeRod(String fishingRodId) {
    state = state.copyWith(
      rods: state.rods
          .where((rod) => rod.fishingRodId != fishingRodId)
          .toList(),
    );
  }

  void clear() {
    state = QuoteDraft();
  }
}

final quoteDraftProvider =
    StateNotifierProvider<QuoteDraftNotifier, QuoteDraft>((ref) {
      return QuoteDraftNotifier();
    });
