import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/quote_record.dart';
import '../providers/calculation_provider.dart';
import '../providers/quote_provider.dart';
import 'app_text_fields.dart';

class SaveQuoteDialog extends ConsumerStatefulWidget {
  const SaveQuoteDialog({
    super.key,
    required this.items,
    required this.mode,
    this.customerName = '',
    this.initialTitle,
    this.initialNote = '',
  });

  final List<QuoteItem> items;
  final CalculationMode mode;
  final String customerName;
  final String? initialTitle;
  final String initialNote;

  @override
  ConsumerState<SaveQuoteDialog> createState() => _SaveQuoteDialogState();
}

class _SaveQuoteDialogState extends ConsumerState<SaveQuoteDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  final _noteController = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final rodCount = widget.items
        .map((item) => item.fishingRodId)
        .toSet()
        .length;
    final extra = rodCount > 1 ? ' 외 ${rodCount - 1}종' : '';
    _titleController = TextEditingController(
      text:
          widget.initialTitle ??
          '${widget.items.first.fishingRodName}$extra ${widget.mode.label} 견적',
    );
    _noteController.text = widget.initialNote;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final id = await ref
          .read(quoteRepositoryProvider)
          .create(
            title: _titleController.text.trim(),
            note: _noteController.text.trim(),
            mode: widget.mode,
            items: widget.items,
            customerName: widget.customerName,
          );
      if (mounted) Navigator.of(context).pop(id);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = '견적을 저장하지 못했습니다. 연결 상태와 직원 권한을 확인한 뒤 다시 시도해주세요.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final quantity = widget.items.fold(0, (sum, item) => sum + item.quantity);
    final total = widget.items.fold(0.0, (sum, item) => sum + item.totalPrice);
    final format = NumberFormat('#,###');

    return PopScope(
      canPop: !_saving,
      child: AlertDialog(
        title: const Text('견적 저장'),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${widget.mode.label} · $quantity대 · ${format.format(total)}원',
                  ),
                  if (widget.customerName.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('고객 ${widget.customerName}'),
                  ],
                  const SizedBox(height: 8),
                  const Text('담은 낚시대 전체를 한 건의 견적으로 기록합니다.'),
                  const SizedBox(height: 20),
                  AppTextFormField(
                    controller: _titleController,
                    enabled: !_saving,
                    autofocus: true,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: '견적 제목',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return '견적 제목을 입력해주세요';
                      }
                      if (value.trim().length > 120) {
                        return '제목은 120자 이내로 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  AppTextFormField(
                    controller: _noteController,
                    enabled: !_saving,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: '메모 (선택)',
                      hintText: '고객명이나 상담 내용을 남겨보세요',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) => (value?.trim().length ?? 0) > 4000
                        ? '메모는 4,000자 이내로 입력해주세요'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('취소'),
          ),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save_outlined),
            label: Text(_saving ? '저장 중...' : '저장'),
          ),
        ],
      ),
    );
  }
}
