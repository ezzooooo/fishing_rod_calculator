import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/quote_record.dart';
import '../providers/calculation_provider.dart';
import '../providers/quote_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/app_text_fields.dart';

class QuoteHistoryScreen extends ConsumerStatefulWidget {
  const QuoteHistoryScreen({super.key});

  @override
  ConsumerState<QuoteHistoryScreen> createState() => _QuoteHistoryScreenState();
}

class _QuoteHistoryScreenState extends ConsumerState<QuoteHistoryScreen> {
  final _searchController = TextEditingController();
  final _money = NumberFormat('#,###');
  final _date = DateFormat('yyyy.MM.dd HH:mm');
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final records = ref.watch(quoteRecordsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('견적 내역')),
      drawer: const AppDrawer(currentRoute: '/quotes'),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1000),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: AppTextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      labelText: '견적 검색',
                      hintText: '고객명, 제목, 메모, 낚시대 또는 브랜드명',
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
                    onChanged: (value) =>
                        setState(() => _search = value.trim().toLowerCase()),
                  ),
                ),
                Expanded(
                  child: records.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, stackTrace) => _message(
                      icon: Icons.cloud_off_outlined,
                      title: '견적 내역을 불러오지 못했습니다',
                      description: '연결 상태와 직원 권한을 확인한 뒤 다시 시도해주세요.',
                      action: OutlinedButton.icon(
                        onPressed: () => ref.invalidate(quoteRecordsProvider),
                        icon: const Icon(Icons.refresh),
                        label: const Text('다시 시도'),
                      ),
                    ),
                    data: _buildRecords,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRecords(List<QuoteRecord> records) {
    if (records.isEmpty) {
      return _message(
        icon: Icons.receipt_long_outlined,
        title: '저장된 견적이 없습니다',
        description: '새 견적 만들기에서 낚시대를 담은 뒤 저장해주세요.',
        action: OutlinedButton.icon(
          onPressed: () => context.go('/'),
          icon: const Icon(Icons.calculate_outlined),
          label: const Text('새 견적 만들기'),
        ),
      );
    }
    final filtered = records.where((record) {
      final haystack = [
        record.title,
        record.customerName,
        record.note,
        record.mode.label,
        ...record.items.map(
          (item) => '${item.fishingRodName} ${item.brandName} ${item.length}',
        ),
      ].join(' ').toLowerCase();
      return haystack.contains(_search);
    }).toList();
    if (filtered.isEmpty) {
      return _message(
        icon: Icons.search_off,
        title: '검색 결과가 없습니다',
        description: '다른 제목이나 낚시대 이름으로 검색해주세요.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: filtered.length + 1,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        if (index == 0) {
          return Text(
            '총 ${filtered.length}건 · 최근 기록순',
            style: Theme.of(context).textTheme.bodySmall,
          );
        }
        final record = filtered[index - 1];
        final rodNames = record.items
            .map(
              (item) => item.brandName.isEmpty
                  ? item.fishingRodName
                  : '[${item.brandName}] ${item.fishingRodName}',
            )
            .toSet()
            .join(', ');
        return Card(
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => context.push('/quotes/${record.id}'),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          child: Text(record.mode.label),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          record.title,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (record.customerName.isNotEmpty) ...[
                    Text('고객  ${record.customerName}'),
                    const SizedBox(height: 6),
                  ],
                  Text(rodNames, maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 16,
                    runSpacing: 4,
                    children: [
                      Text(
                        '${record.items.length}개 항목 · 총 ${record.totalQuantity}대',
                      ),
                      Text(
                        '${_money.format(record.totalPrice)}원',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '기록 ${_date.format(record.createdAt.toLocal())}'
                    '${record.updatedAt == null ? '' : ' · 수정 ${_date.format(record.updatedAt!.toLocal())}'}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (record.note.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      record.note,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _message({
    required IconData icon,
    required String title,
    required String description,
    Widget? action,
  }) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 20), action],
          ],
        ),
      ),
    );
  }
}
