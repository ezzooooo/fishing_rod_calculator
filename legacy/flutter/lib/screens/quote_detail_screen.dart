import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/quote_record.dart';
import '../providers/calculation_provider.dart';
import '../providers/quote_provider.dart';
import '../widgets/app_text_fields.dart';

class QuoteDetailScreen extends ConsumerStatefulWidget {
  const QuoteDetailScreen({super.key, required this.quoteId});

  final String quoteId;

  @override
  ConsumerState<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends ConsumerState<QuoteDetailScreen> {
  final _title = TextEditingController();
  final _customerName = TextEditingController();
  final _note = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _money = NumberFormat('#,###');
  final _date = DateFormat('yyyy.MM.dd HH:mm:ss');
  QuoteRecord? _editBase;
  List<QuoteItem> _draftItems = [];
  CalculationMode _draftMode = CalculationMode.purchase;
  bool _busy = false;
  String? _error;

  bool get _editing => _editBase != null;

  @override
  void dispose() {
    _title.dispose();
    _customerName.dispose();
    _note.dispose();
    super.dispose();
  }

  void _startEditing(QuoteRecord record) {
    _title.text = record.title;
    _customerName.text = record.customerName;
    _note.text = record.note;
    setState(() {
      _editBase = record;
      _draftItems = List.of(record.items);
      _draftMode = record.mode;
      _error = null;
    });
  }

  Future<bool> _confirmDiscard() async {
    if (!_editing) return true;
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('수정 취소'),
            content: const Text('저장하지 않은 변경사항을 버리시겠습니까?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('계속 수정'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('변경사항 버리기'),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _cancelEditing() async {
    if (await _confirmDiscard() && mounted) {
      setState(() {
        _editBase = null;
        _error = null;
      });
    }
  }

  Future<void> _leave() async {
    if (_busy) return;
    if (!await _confirmDiscard() || !mounted) return;
    setState(() => _editBase = null);
    await WidgetsBinding.instance.endOfFrame;
    if (!mounted) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/quotes');
    }
  }

  Future<void> _save() async {
    if (_busy) return;
    if (!_formKey.currentState!.validate()) return;
    if (_draftItems.isEmpty) {
      setState(() => _error = '견적 항목을 한 개 이상 추가해주세요.');
      return;
    }
    final updated = _editBase!.copyWith(
      title: _title.text.trim(),
      customerName: _customerName.text.trim(),
      note: _note.text.trim(),
      mode: _draftMode,
      items: _draftItems,
    );
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(quoteRepositoryProvider).update(updated);
      if (!mounted) return;
      setState(() => _editBase = null);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('견적이 수정되었습니다')));
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is QuoteConflictException
            ? '다른 직원이 이 견적을 수정했습니다. 수정을 취소하고 최신 내역을 확인해주세요.'
            : '견적을 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(QuoteRecord record) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('견적 삭제'),
        content: Text('「${record.title}」 견적을 삭제하시겠습니까?\n삭제한 내역은 복구할 수 없습니다.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(quoteRepositoryProvider).delete(record.id);
      if (!mounted) return;
      context.go('/quotes');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = '견적을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _editItem([int? index]) async {
    final result = await showDialog<QuoteItem>(
      context: context,
      builder: (context) => _QuoteItemDialog(
        item: index == null ? null : _draftItems[index],
        mode: _draftMode,
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      if (index == null) {
        _draftItems = [..._draftItems, result];
      } else {
        _draftItems = [..._draftItems]..[index] = result;
      }
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final recordState = ref.watch(quoteRecordProvider(widget.quoteId));
    final record = recordState.valueOrNull;
    return PopScope(
      canPop: !_editing && !_busy,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && !_busy) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_editing ? '견적 수정' : '견적 상세'),
          leading: IconButton(
            tooltip: '견적 내역으로',
            onPressed: _busy ? null : _leave,
            icon: const Icon(Icons.arrow_back),
          ),
          actions: [
            if (_editing)
              TextButton(
                onPressed: _busy ? null : _cancelEditing,
                child: const Text('취소'),
              )
            else if (record != null) ...[
              IconButton(
                tooltip: '견적 수정',
                onPressed: _busy ? null : () => _startEditing(record),
                icon: const Icon(Icons.edit_outlined),
              ),
              IconButton(
                tooltip: '견적 삭제',
                onPressed: _busy ? null : () => _delete(record),
                icon: const Icon(Icons.delete_outline),
              ),
            ],
          ],
        ),
        body: SafeArea(
          child: _editing
              ? _buildRecord(_editBase!)
              : recordState.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (error, stackTrace) => _status(
                    '견적을 불러오지 못했습니다',
                    '연결 상태와 직원 권한을 확인해주세요.',
                    retry: true,
                  ),
                  data: (record) => record == null
                      ? _status('견적을 찾을 수 없습니다', '삭제된 견적이거나 잘못된 주소입니다.')
                      : _buildRecord(record),
                ),
        ),
        bottomNavigationBar: _editing
            ? SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _save,
                    icon: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save_outlined),
                    label: Text(_busy ? '저장 중...' : '수정 내용 저장'),
                  ),
                ),
              )
            : null,
      ),
    );
  }

  Widget _buildRecord(QuoteRecord record) {
    final items = _editing ? _draftItems : record.items;
    final mode = _editing ? _draftMode : record.mode;
    final totalQuantity = items.fold(0, (sum, item) => sum + item.quantity);
    final totalPrice = items.fold(0.0, (sum, item) => sum + item.totalPrice);
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_busy) const LinearProgressIndicator(),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Text(_error!),
                  ),
                  const SizedBox(height: 16),
                ],
                if (_editing) ...[
                  AppTextFormField(
                    controller: _customerName,
                    enabled: !_busy,
                    decoration: const InputDecoration(
                      labelText: '고객명 (선택)',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) => (value?.trim().length ?? 0) > 120
                        ? '고객명은 120자 이내로 입력해주세요'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextFormField(
                    controller: _title,
                    enabled: !_busy,
                    decoration: const InputDecoration(
                      labelText: '견적 제목',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return '견적 제목을 입력해주세요';
                      }
                      return value.trim().length > 120
                          ? '제목은 120자 이내로 입력해주세요'
                          : null;
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<CalculationMode>(
                    initialValue: _draftMode,
                    decoration: const InputDecoration(
                      labelText: '견적 구분',
                      border: OutlineInputBorder(),
                      helperText: '구분을 변경하면 저장된 기준 단가와 적용율로 금액을 다시 계산합니다.',
                      helperMaxLines: 2,
                    ),
                    items: CalculationMode.values
                        .map(
                          (mode) => DropdownMenuItem(
                            value: mode,
                            child: Text(mode.label),
                          ),
                        )
                        .toList(),
                    onChanged: _busy
                        ? null
                        : (value) {
                            if (value == null) return;
                            setState(() {
                              _draftMode = value;
                              _draftItems = _draftItems
                                  .map(
                                    (item) => QuoteItem.priced(
                                      fishingRodId: item.fishingRodId,
                                      fishingRodName: item.fishingRodName,
                                      brandName: item.brandName,
                                      length: item.length,
                                      quantity: item.quantity,
                                      unitPrice: item.unitPrice,
                                      rate: item.rate,
                                      mode: value,
                                    ),
                                  )
                                  .toList();
                            });
                          },
                  ),
                ] else ...[
                  Text(
                    record.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text('${mode.label} 견적'),
                  if (record.customerName.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('고객  ${record.customerName}'),
                  ],
                ],
                const SizedBox(height: 16),
                Text('기록 시간  ${_date.format(record.createdAt.toLocal())}'),
                if (record.updatedAt != null) ...[
                  const SizedBox(height: 4),
                  Text('최종 수정  ${_date.format(record.updatedAt!.toLocal())}'),
                ],
                const SizedBox(height: 16),
                Card(
                  margin: EdgeInsets.zero,
                  color: Theme.of(context).colorScheme.primaryContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('총 $totalQuantity대 · ${items.length}개 항목'),
                        const SizedBox(height: 8),
                        Text(
                          '${_money.format(totalPrice)}원',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '견적 항목',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (_editing)
                      TextButton.icon(
                        onPressed: _busy || items.length >= 500
                            ? null
                            : () => _editItem(),
                        icon: const Icon(Icons.add),
                        label: const Text('항목 추가'),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('항목 추가를 눌러 견적 항목을 입력해주세요.'),
                  ),
                ...items.asMap().entries.map((entry) {
                  final item = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  '${item.brandName.isEmpty ? '' : '[${item.brandName}] '}${item.fishingRodName}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              if (_editing)
                                PopupMenuButton<String>(
                                  tooltip: '항목 편집',
                                  enabled: !_busy,
                                  onSelected: (value) {
                                    if (value == 'edit') {
                                      _editItem(entry.key);
                                    } else {
                                      setState(() {
                                        _draftItems = [..._draftItems]
                                          ..removeAt(entry.key);
                                      });
                                    }
                                  },
                                  itemBuilder: (context) => const [
                                    PopupMenuItem(
                                      value: 'edit',
                                      child: Text('항목 수정'),
                                    ),
                                    PopupMenuItem(
                                      value: 'remove',
                                      child: Text('항목 삭제'),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('${item.length}칸 · ${item.quantity}대'),
                          const SizedBox(height: 4),
                          Text(
                            '기준 단가 ${_money.format(item.unitPrice)}원 · 적용율 ${NumberFormat('0.##').format(item.rate * 100)}%',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text('최종 단가 ${_money.format(item.finalUnitPrice)}원'),
                          const SizedBox(height: 8),
                          Text(
                            '합계 ${_money.format(item.totalPrice)}원',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 12),
                if (_editing)
                  AppTextFormField(
                    controller: _note,
                    enabled: !_busy,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: '메모 (선택)',
                      hintText: '고객명이나 상담 내용을 남겨보세요',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) => (value?.trim().length ?? 0) > 4000
                        ? '메모는 4,000자 이내로 입력해주세요'
                        : null,
                  )
                else if (record.note.isNotEmpty) ...[
                  Text(
                    '메모',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SelectableText(record.note),
                ],
                const SizedBox(height: 16),
                Text(
                  '저장 당시의 낚시대 정보와 가격입니다. 가격표가 변경되어도 이 견적은 유지됩니다.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _status(String title, String description, {bool retry = false}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            if (retry)
              OutlinedButton.icon(
                onPressed: () =>
                    ref.invalidate(quoteRecordProvider(widget.quoteId)),
                icon: const Icon(Icons.refresh),
                label: const Text('다시 시도'),
              )
            else
              OutlinedButton(
                onPressed: () => context.go('/quotes'),
                child: const Text('견적 내역으로'),
              ),
          ],
        ),
      ),
    );
  }
}

class _QuoteItemDialog extends StatefulWidget {
  const _QuoteItemDialog({required this.item, required this.mode});

  final QuoteItem? item;
  final CalculationMode mode;

  @override
  State<_QuoteItemDialog> createState() => _QuoteItemDialogState();
}

class _QuoteItemDialogState extends State<_QuoteItemDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _brand;
  late final TextEditingController _length;
  late final TextEditingController _quantity;
  late final TextEditingController _price;
  late final TextEditingController _rate;
  late final String _initialPriceText;
  late final String _initialRateText;

  @override
  void initState() {
    super.initState();
    final item = widget.item;
    _name = TextEditingController(text: item?.fishingRodName ?? '');
    _brand = TextEditingController(text: item?.brandName ?? '');
    _length = TextEditingController(text: item?.length.toString() ?? '');
    _quantity = TextEditingController(text: item?.quantity.toString() ?? '1');
    _initialPriceText = item == null ? '' : _numberText(item.unitPrice);
    _initialRateText = _numberText((item?.rate ?? 0.7) * 100);
    _price = TextEditingController(text: _initialPriceText);
    _rate = TextEditingController(text: _initialRateText);
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _brand,
      _length,
      _quantity,
      _price,
      _rate,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final original = widget.item;
    final unitPrice = original != null && _price.text == _initialPriceText
        ? original.unitPrice
        : double.parse(_price.text);
    final rate = original != null && _rate.text == _initialRateText
        ? original.rate
        : double.parse(_rate.text) / 100;
    final QuoteItem updated;
    if (original != null &&
        unitPrice == original.unitPrice &&
        rate == original.rate) {
      updated = original.copyWith(
        fishingRodName: _name.text.trim(),
        brandName: _brand.text.trim(),
        length: int.parse(_length.text),
        quantity: int.parse(_quantity.text),
      );
    } else {
      updated = QuoteItem.priced(
        fishingRodId:
            original?.fishingRodId ??
            'manual-${DateTime.now().microsecondsSinceEpoch}',
        fishingRodName: _name.text.trim(),
        brandName: _brand.text.trim(),
        length: int.parse(_length.text),
        quantity: int.parse(_quantity.text),
        unitPrice: unitPrice,
        rate: rate,
        mode: widget.mode,
      );
    }
    Navigator.pop(context, updated);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.item == null ? '견적 항목 추가' : '견적 항목 수정'),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppTextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: '낚시대 이름'),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? '낚시대 이름을 입력해주세요'
                      : null,
                ),
                const SizedBox(height: 12),
                AppTextFormField(
                  controller: _brand,
                  decoration: const InputDecoration(labelText: '브랜드 (선택)'),
                ),
                const SizedBox(height: 12),
                AppTextFormField(
                  controller: _length,
                  decoration: const InputDecoration(
                    labelText: '칸수',
                    suffixText: '칸',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: _positiveInteger,
                ),
                const SizedBox(height: 12),
                AppTextFormField(
                  controller: _quantity,
                  decoration: const InputDecoration(
                    labelText: '수량',
                    suffixText: '대',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: _positiveInteger,
                ),
                const SizedBox(height: 12),
                AppTextFormField(
                  controller: _price,
                  decoration: const InputDecoration(
                    labelText: '기준 단가',
                    suffixText: '원',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  validator: (value) {
                    final price = double.tryParse(value ?? '');
                    return price == null || !price.isFinite || price < 0
                        ? '0 이상의 금액을 입력해주세요'
                        : null;
                  },
                ),
                const SizedBox(height: 12),
                AppTextFormField(
                  controller: _rate,
                  decoration: const InputDecoration(
                    labelText: '적용율',
                    suffixText: '%',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  validator: (value) {
                    final rate = double.tryParse(value ?? '');
                    return rate == null ||
                            !rate.isFinite ||
                            rate < 0 ||
                            rate > 100
                        ? '0~100 사이의 적용율을 입력해주세요'
                        : null;
                  },
                ),
                const SizedBox(height: 16),
                Text(
                  widget.mode == CalculationMode.purchase
                      ? '최종 단가는 적용율을 반영한 뒤 천 원 단위로 내림합니다.'
                      : '최종 단가는 적용율을 반영한 뒤 천 원 단위로 올림합니다.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('취소'),
        ),
        FilledButton(onPressed: _submit, child: const Text('적용')),
      ],
    );
  }

  String _numberText(double value) =>
      value.toString().replaceFirst(RegExp(r'\.0$'), '');

  String? _positiveInteger(String? value) {
    final number = int.tryParse(value ?? '');
    return number == null || number <= 0 ? '1 이상의 숫자를 입력해주세요' : null;
  }
}
