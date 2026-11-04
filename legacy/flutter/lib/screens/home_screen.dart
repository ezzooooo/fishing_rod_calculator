import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/quote_draft.dart';
import '../models/quote_record.dart';
import '../providers/brand_provider.dart';
import '../providers/calculation_provider.dart';
import '../providers/fishing_rod_provider.dart';
import '../providers/quote_draft_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/app_text_fields.dart';
import '../widgets/quote_output_actions.dart';
import '../widgets/quote_rod_dialog.dart';
import '../widgets/save_quote_dialog.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  var _formKey = GlobalKey<FormState>();
  late final TextEditingController _customerController;
  late final TextEditingController _noteController;
  final _money = NumberFormat('#,###');

  @override
  void initState() {
    super.initState();
    final draft = ref.read(quoteDraftProvider);
    _customerController = TextEditingController(text: draft.customerName);
    _noteController = TextEditingController(text: draft.note);
  }

  @override
  void dispose() {
    _customerController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _addRod([QuoteDraftRod? group]) async {
    final draft = ref.read(quoteDraftProvider);
    final result = await showDialog<QuoteDraftRod>(
      context: context,
      barrierDismissible: false,
      builder: (context) => QuoteRodDialog(
        mode: draft.mode,
        rods: ref.read(fishingRodProvider),
        brands: ref.read(brandProvider),
        existingGroups: draft.rods,
        initialGroup: group,
      ),
    );
    if (result != null && mounted) {
      if (group != null && group.fishingRodId != result.fishingRodId) {
        ref.read(quoteDraftProvider.notifier).removeRod(group.fishingRodId);
      }
      ref.read(quoteDraftProvider.notifier).upsertRod(result);
    }
  }

  void _removeRod(QuoteDraftRod group) {
    ref.read(quoteDraftProvider.notifier).removeRod(group.fishingRodId);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('${group.rod.name}을 견적에서 뺐습니다.'),
          action: SnackBarAction(
            label: '되돌리기',
            onPressed: () =>
                ref.read(quoteDraftProvider.notifier).upsertRod(group),
          ),
        ),
      );
  }

  Future<void> _resetDraft() async {
    if (ref.read(quoteDraftProvider).hasContent) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('새 견적을 작성할까요?'),
          content: const Text('작성 중인 고객 정보와 담은 낚시대를 비웁니다.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('계속 작성'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('새로 작성'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ref.read(quoteDraftProvider.notifier).clear();
    setState(() => _formKey = GlobalKey<FormState>());
  }

  String _titleForDraft(QuoteDraft draft) {
    if (draft.customerName.trim().isNotEmpty) {
      return '${draft.customerName.trim()} ${draft.mode.label} 견적';
    }
    if (draft.rods.isEmpty) return '${draft.mode.label} 견적';
    final extra = draft.rodCount > 1 ? ' 외 ${draft.rodCount - 1}종' : '';
    return '${draft.rods.first.rod.name}$extra ${draft.mode.label} 견적';
  }

  QuoteRecord _recordForDraft(QuoteDraft draft) => QuoteRecord(
    id: 'draft',
    title: _titleForDraft(draft),
    note: draft.note.trim(),
    customerName: draft.customerName.trim(),
    createdBy: '',
    mode: draft.mode,
    items: draft.items,
    createdAt: DateTime.now(),
  );

  Future<void> _saveQuote() async {
    if (!_formKey.currentState!.validate()) return;
    final draft = ref.read(quoteDraftProvider);
    if (draft.items.isEmpty) return;
    final id = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => SaveQuoteDialog(
        items: draft.items,
        mode: draft.mode,
        customerName: draft.customerName.trim(),
        initialTitle: _titleForDraft(draft),
        initialNote: draft.note.trim(),
      ),
    );
    if (!mounted || id == null) return;
    ref.read(quoteDraftProvider.notifier).clear();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('견적을 저장했습니다.')));
    context.push('/quotes/$id');
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(quoteDraftProvider);
    final rods = ref.watch(fishingRodProvider);
    ref.listen<QuoteDraft>(quoteDraftProvider, (previous, next) {
      if (_customerController.text != next.customerName) {
        _customerController.text = next.customerName;
      }
      if (_noteController.text != next.note) {
        _noteController.text = next.note;
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('새 견적 만들기', style: TextStyle(fontSize: 22)),
        actions: [
          IconButton(
            tooltip: '견적 내역',
            onPressed: () => context.push('/quotes'),
            icon: const Icon(Icons.history),
          ),
          IconButton(
            tooltip: '새로 작성',
            onPressed: _resetDraft,
            icon: const Icon(Icons.note_add_outlined),
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/'),
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLowest,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1240),
              child: Form(
                key: _formKey,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final content = Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(bottom: 20),
                          child: Text('한 고객의 낚시대를 모아 전체 금액을 확인하고 저장하세요.'),
                        ),
                        _buildCustomerCard(draft),
                        const SizedBox(height: 24),
                        _buildBasketHeader(rods.isNotEmpty),
                        const SizedBox(height: 12),
                        if (rods.isEmpty && draft.rods.isEmpty)
                          _buildEmptyCatalogue()
                        else if (draft.rods.isEmpty)
                          _buildEmptyBasket()
                        else
                          ...draft.rods.map(
                            (group) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _buildRodCard(group, draft.mode),
                            ),
                          ),
                      ],
                    );
                    if (constraints.maxWidth >= 1000) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: content),
                          const SizedBox(width: 24),
                          SizedBox(width: 310, child: _buildSummary(draft)),
                        ],
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        content,
                        const SizedBox(height: 12),
                        _buildSummary(draft),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: _buildSaveBar(draft),
    );
  }

  Widget _buildCustomerCard(QuoteDraft draft) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '고객 정보',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            AppTextFormField(
              key: const ValueKey('quote-customer'),
              controller: _customerController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: '고객명 (선택)',
                hintText: '고객명이나 구분할 이름',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
              onChanged: ref.read(quoteDraftProvider.notifier).setCustomerName,
              validator: (value) => (value?.trim().length ?? 0) > 120
                  ? '고객명은 120자 이내로 입력해주세요'
                  : null,
            ),
            const SizedBox(height: 16),
            AppTextFormField(
              key: const ValueKey('quote-note'),
              controller: _noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: '메모 (선택)',
                hintText: '상담 내용이나 방문 일정을 남겨보세요',
                border: OutlineInputBorder(),
              ),
              onChanged: ref.read(quoteDraftProvider.notifier).setNote,
              validator: (value) => (value?.trim().length ?? 0) > 4000
                  ? '메모는 4,000자 이내로 입력해주세요'
                  : null,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  '견적 구분',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                for (final mode in CalculationMode.values)
                  ChoiceChip(
                    label: Text(mode.label),
                    selected: draft.mode == mode,
                    onSelected: (_) =>
                        ref.read(quoteDraftProvider.notifier).setMode(mode),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBasketHeader(bool canAdd) {
    return Row(
      children: [
        Expanded(
          child: Text(
            '담은 낚시대',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        FilledButton.icon(
          onPressed: canAdd ? () => _addRod() : null,
          icon: const Icon(Icons.add),
          label: const Text('낚시대 추가'),
        ),
      ],
    );
  }

  Widget _buildEmptyBasket() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(
          children: [
            Icon(
              Icons.playlist_add_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 12),
            const Text(
              '아직 담은 낚시대가 없습니다',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              '낚시대 추가를 눌러 종류와 칸수별 수량을 담아보세요.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCatalogue() {
    return const Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(Icons.sports_outlined, size: 48, color: Colors.grey),
            SizedBox(height: 12),
            Text(
              '등록된 낚시대가 없습니다',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('먼저 브랜드와 낚시대를 등록해주세요', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildRodCard(QuoteDraftRod group, CalculationMode mode) {
    final items = group.itemsForMode(mode);
    final total = items.fold(0.0, (value, item) => value + item.totalPrice);
    return Card(
      key: ValueKey('quote-rod-${group.fishingRodId}'),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${group.brandName.isEmpty ? '' : '[${group.brandName}] '}${group.rod.name}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  tooltip: '낚시대 수정',
                  onPressed: () => _addRod(group),
                  icon: const Icon(Icons.edit_outlined, size: 20),
                ),
                IconButton(
                  tooltip: '낚시대 빼기',
                  onPressed: () => _removeRod(group),
                  icon: const Icon(Icons.close, size: 20),
                ),
              ],
            ),
            const Divider(height: 20),
            for (final item in items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${item.length}칸 · ${item.quantity}대'),
                          const SizedBox(height: 4),
                          Text(
                            '단가 ${_money.format(item.finalUnitPrice)}원 · 적용율 ${NumberFormat('0.##').format(item.rate * 100)}%',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${_money.format(item.totalPrice)}원',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            const Divider(height: 20),
            Text(
              '소계 ${_money.format(total)}원',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary(QuoteDraft draft) {
    return Card(
      margin: EdgeInsets.zero,
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '견적 합계',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(
              '${draft.mode.label} · ${draft.rodCount}종 · 총 ${draft.totalQuantity}대',
            ),
            const SizedBox(height: 12),
            Text(
              '${_money.format(draft.totalPrice)}원',
              key: const ValueKey('quote-summary-total'),
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              '기준 합계 ${_money.format(draft.totalOriginalPrice)}원',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            Text(
              draft.items.isEmpty
                  ? '낚시대를 담으면 전체 금액을 확인할 수 있습니다.'
                  : '담은 낚시대 전체가 한 건의 견적으로 저장됩니다.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (draft.items.isNotEmpty) ...[
              const Divider(height: 28),
              QuoteOutputActions(record: _recordForDraft(draft)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSaveBar(QuoteDraft draft) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1240),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '총 ${draft.rodCount}종 · ${draft.totalQuantity}대',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            '${_money.format(draft.totalPrice)}원',
                            key: const ValueKey('quote-footer-total'),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  FilledButton.icon(
                    key: const ValueKey('save-quote'),
                    onPressed: draft.items.isEmpty ? null : _saveQuote,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('견적 저장'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
