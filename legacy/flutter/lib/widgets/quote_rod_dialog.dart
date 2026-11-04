import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../models/brand.dart';
import '../models/calculation_item.dart';
import '../models/fishing_rod.dart';
import '../models/quote_draft.dart';
import '../providers/calculation_provider.dart';
import 'app_text_fields.dart';

/// Edits one rod group locally. The surrounding quote changes only on apply.
class QuoteRodDialog extends StatefulWidget {
  const QuoteRodDialog({
    super.key,
    required this.mode,
    required this.rods,
    required this.brands,
    required this.existingGroups,
    this.initialGroup,
  });

  final CalculationMode mode;
  final List<FishingRod> rods;
  final List<Brand> brands;
  final List<QuoteDraftRod> existingGroups;
  final QuoteDraftRod? initialGroup;

  @override
  State<QuoteRodDialog> createState() => _QuoteRodDialogState();
}

class _QuoteRodDialogState extends State<QuoteRodDialog> {
  static const _rateOptions = [
    0.4,
    0.45,
    0.5,
    0.55,
    0.6,
    0.65,
    0.7,
    0.75,
    0.8,
    0.85,
    0.9,
    0.95,
    1.0,
  ];

  final _formKey = GlobalKey<FormState>();
  final _searchController = TextEditingController();
  final _quantities = <int, TextEditingController>{};
  final _calculations = <int, CalculationItem>{};
  final _money = NumberFormat('#,###');
  late final Map<String, QuoteDraftRod> _existing;
  late final List<FishingRod> _rods;
  FishingRod? _selected;
  String _search = '';
  String? _error;

  CalculationPriceMode get _priceMode => widget.mode == CalculationMode.purchase
      ? CalculationPriceMode.purchase
      : CalculationPriceMode.sale;

  List<int> get _lengths {
    final selected = _selected;
    if (selected == null) return [];
    return <int>{...selected.availableLengths, ..._calculations.keys}.toList()
      ..sort();
  }

  @override
  void initState() {
    super.initState();
    _existing = {
      for (final group in widget.existingGroups) group.rod.id: group,
    };
    final initialGroup = widget.initialGroup;
    if (initialGroup != null) {
      _existing[initialGroup.rod.id] = initialGroup;
    }
    // A group already in the quote keeps its captured price table, even if its
    // catalogue entry was changed or deleted while the quote was being written.
    _rods = {
      for (final rod in widget.rods) rod.id: rod,
      for (final group in _existing.values) group.rod.id: group.rod,
    }.values.toList()..sort((a, b) => a.name.compareTo(b.name));
    if (widget.initialGroup != null) {
      _loadRod(widget.initialGroup!.rod);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _disposeQuantities();
    super.dispose();
  }

  void _disposeQuantities() {
    for (final controller in _quantities.values) {
      controller.dispose();
    }
    _quantities.clear();
  }

  String _brandName(FishingRod rod) {
    final existing = _existing[rod.id];
    if (existing != null) return existing.brandName;
    for (final brand in widget.brands) {
      if (brand.id == rod.brandId) return brand.name;
    }
    return '알 수 없음';
  }

  void _loadRod(FishingRod rod) {
    _disposeQuantities();
    _calculations.clear();
    _selected = rod;
    final existing = _existing[rod.id];
    if (existing != null) {
      for (final calculation in existing.calculations) {
        _calculations[calculation.length] = calculation;
      }
    }
    for (final length in _lengths) {
      final calculation = _calculations.putIfAbsent(
        length,
        () => CalculationItem(
          fishingRodId: rod.id,
          length: length,
          quantity: 0,
          discountRate: 0.7,
          saleRate: 0.7,
        ),
      );
      _quantities[length] = TextEditingController(
        text: calculation.quantity.toString(),
      );
    }
    _error = null;
  }

  double _unitPrice(int length) {
    final rod = _selected!;
    return widget.mode == CalculationMode.purchase
        ? rod.getPurchasePriceForLength(length)
        : rod.getSalePriceForLength(length);
  }

  int _quantity(int length) =>
      int.tryParse(_quantities[length]?.text ?? '') ?? 0;

  double _lineTotal(int length) => _calculations[length]!
      .copyWith(quantity: _quantity(length))
      .getFinalPriceForMode(_unitPrice(length), _priceMode);

  void _submit() {
    if (_selected == null || !_formKey.currentState!.validate()) return;
    final calculations = [
      for (final length in _lengths)
        if (_quantity(length) > 0)
          _calculations[length]!.copyWith(quantity: _quantity(length)),
    ];
    if (calculations.isEmpty) {
      setState(() => _error = '수량을 한 대 이상 입력해주세요.');
      return;
    }
    Navigator.of(context).pop(
      QuoteDraftRod(
        rod: _selected!,
        brandName: _brandName(_selected!),
        calculations: calculations,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _rods.where((rod) {
      final label = '${_brandName(rod)} ${rod.name}'.toLowerCase();
      return label.contains(_search);
    }).toList();
    final existing = _selected == null ? null : _existing[_selected!.id];
    final lengths = _lengths;
    final quantity = lengths.fold(
      0,
      (total, length) => total + _quantity(length),
    );
    final total = lengths.fold(
      0.0,
      (value, length) => value + _lineTotal(length),
    );

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 740,
          maxHeight: MediaQuery.sizeOf(context).height * 0.9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 8, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.initialGroup == null ? '낚시대 담기' : '담은 낚시대 수정',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: '닫기',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${widget.mode.label} 견적에 담을 낚시대와 칸수별 수량을 선택하세요.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 16),
                      AppTextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: '낚시대명 또는 브랜드명으로 검색',
                          prefixIcon: const Icon(Icons.search),
                          border: const OutlineInputBorder(),
                          suffixIcon: _search.isEmpty
                              ? null
                              : IconButton(
                                  tooltip: '검색 지우기',
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _search = '');
                                  },
                                  icon: const Icon(Icons.clear),
                                ),
                        ),
                        onChanged: (value) => setState(
                          () => _search = value.trim().toLowerCase(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<FishingRod>(
                        key: ValueKey('quote-rod-${_selected?.id}-$_search'),
                        initialValue: filtered.contains(_selected)
                            ? _selected
                            : null,
                        isExpanded: true,
                        menuMaxHeight: 300,
                        decoration: const InputDecoration(
                          labelText: '낚시대 선택',
                          border: OutlineInputBorder(),
                        ),
                        items: [
                          for (final rod in filtered)
                            DropdownMenuItem(
                              value: rod,
                              child: Text(
                                '[${_brandName(rod)}] ${rod.name}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                        onChanged: (rod) {
                          if (rod == null || rod.id == _selected?.id) return;
                          setState(() => _loadRod(rod));
                        },
                      ),
                      if (filtered.isEmpty) ...[
                        const SizedBox(height: 12),
                        const Text('검색 결과가 없습니다. 다른 이름으로 검색해주세요.'),
                      ],
                      if (_selected != null) ...[
                        const SizedBox(height: 20),
                        Text(
                          '${_selected!.name} · 칸수별 수량',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (existing != null) ...[
                          const SizedBox(height: 8),
                          const Text('이미 담은 낚시대입니다. 변경 반영을 누르면 기존 수량을 바꿉니다.'),
                        ],
                        const SizedBox(height: 12),
                        for (final length in lengths) _buildLength(length),
                      ] else ...[
                        const SizedBox(height: 24),
                        const Icon(
                          Icons.sports_outlined,
                          size: 48,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '낚시대를 선택하면 칸수별 수량을 입력할 수 있습니다.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 16,
                    runSpacing: 4,
                    children: [
                      Text('총 $quantity대'),
                      Text(
                        '${_money.format(total)}원',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _selected == null ? null : _submit,
                    icon: Icon(existing == null ? Icons.add : Icons.check),
                    label: Text(existing == null ? '견적에 담기' : '변경 반영'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLength(int length) {
    final calculation = _calculations[length]!;
    final rate = calculation.getRateForMode(_priceMode);
    final rates = <double>{..._rateOptions, rate}.toList()..sort();
    return Card(
      key: ValueKey('quote-line-${_selected!.id}-$length'),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: 12,
              runSpacing: 4,
              children: [
                Text(
                  '$length칸',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${widget.mode.priceLabel} ${_money.format(_unitPrice(length))}원',
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: AppTextFormField(
                    key: ValueKey('quote-quantity-$length'),
                    controller: _quantities[length],
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: '수량',
                      suffixText: '대',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      final quantity = int.tryParse(value ?? '');
                      return quantity == null || quantity < 0
                          ? '0 이상 입력'
                          : null;
                    },
                    onChanged: (_) => setState(() => _error = null),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<double>(
                    key: ValueKey('quote-rate-$length'),
                    initialValue: rate,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: '적용율',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      for (final value in rates)
                        DropdownMenuItem(
                          value: value,
                          child: Text(
                            '${NumberFormat('0.##').format(value * 100)}%',
                          ),
                        ),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        _calculations[length] =
                            widget.mode == CalculationMode.purchase
                            ? calculation.copyWith(discountRate: value)
                            : calculation.copyWith(saleRate: value);
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '소계 ${_money.format(_lineTotal(length))}원',
              textAlign: TextAlign.right,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ],
        ),
      ),
    );
  }
}
