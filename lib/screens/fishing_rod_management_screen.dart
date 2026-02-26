import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/fishing_rod_provider.dart';
import '../providers/brand_provider.dart';
import '../models/brand.dart';
import '../widgets/app_drawer.dart';

class FishingRodManagementScreen extends ConsumerStatefulWidget {
  const FishingRodManagementScreen({super.key});

  @override
  ConsumerState<FishingRodManagementScreen> createState() =>
      _FishingRodManagementScreenState();
}

class _FishingRodManagementScreenState
    extends ConsumerState<FishingRodManagementScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  Timer? _debounceTimer;

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _updateSearchQuery(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        _searchQuery = query.trim();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isMobileLayout = MediaQuery.sizeOf(context).width < 600;
    final fishingRods = ref.watch(fishingRodProvider);
    final brands = ref.watch(brandProvider);

    // 검색 필터링 로직
    final filteredRods = _searchQuery.isEmpty
        ? fishingRods
        : fishingRods.where((rod) {
            final brandName = brands
                .firstWhere(
                  (brand) => brand.id == rod.brandId,
                  orElse: () => const Brand(id: '', name: ''),
                )
                .name;
            return rod.name.toLowerCase().contains(
                  _searchQuery.toLowerCase(),
                ) ||
                brandName.toLowerCase().contains(_searchQuery.toLowerCase());
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('낚시대 관리'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/fishing-rods/add'),
            tooltip: '낚시대 추가',
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/fishing-rods'),
      body: Column(
        children: [
          // 검색 바
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey.shade50,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '낚시대명 또는 브랜드명으로 검색',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _debounceTimer?.cancel();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    border: const OutlineInputBorder(),
                  ),
                  onChanged: _updateSearchQuery,
                ),
                if (_searchQuery.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    '총 ${fishingRods.length}개 중 ${filteredRods.length}개 표시',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ],
            ),
          ),

          // 낚시대 목록
          Expanded(
            child: fishingRods.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.sports_outlined,
                          size: 80,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          '등록된 낚시대가 없습니다',
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                        SizedBox(height: 8),
                        Text(
                          '+ 버튼을 눌러 낚시대를 추가해보세요',
                          style: TextStyle(fontSize: 14, color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : filteredRods.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.search_off,
                          size: 80,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '검색 결과가 없습니다',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '"$_searchQuery"와 일치하는 낚시대가 없습니다',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredRods.length,
                    itemBuilder: (context, index) {
                      final rod = filteredRods[index];
                      final brand = brands.firstWhere(
                        (b) => b.id == rod.brandId,
                        orElse: () => const Brand(id: '', name: '알 수 없음'),
                      );

                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.sports),
                          ),
                          title: Text(
                            rod.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('브랜드: ${brand.name}'),
                              Text('범위: ${rod.minValue}~${rod.maxValue}'),
                              Text('중고가: ${rod.usedPrice.toStringAsFixed(0)}원'),
                            ],
                          ),
                          trailing: isMobileLayout
                              ? PopupMenuButton<String>(
                                  tooltip: '더보기',
                                  onSelected: (value) {
                                    if (value == 'edit') {
                                      context.go(
                                        '/fishing-rods/edit/${rod.id}',
                                      );
                                      return;
                                    }
                                    if (value == 'delete') {
                                      _showDeleteDialog(
                                        context,
                                        ref,
                                        rod.id,
                                        rod.name,
                                      );
                                    }
                                  },
                                  itemBuilder: (context) => const [
                                    PopupMenuItem(
                                      value: 'edit',
                                      child: Text('수정'),
                                    ),
                                    PopupMenuItem(
                                      value: 'delete',
                                      child: Text('삭제'),
                                    ),
                                  ],
                                )
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.edit),
                                      onPressed: () => context.go(
                                        '/fishing-rods/edit/${rod.id}',
                                      ),
                                      tooltip: '수정',
                                    ),
                                    IconButton(
                                      icon: const Icon(
                                        Icons.delete,
                                        color: Colors.red,
                                      ),
                                      onPressed: () => _showDeleteDialog(
                                        context,
                                        ref,
                                        rod.id,
                                        rod.name,
                                      ),
                                      tooltip: '삭제',
                                    ),
                                  ],
                                ),
                          isThreeLine: true,
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(
    BuildContext context,
    WidgetRef ref,
    String rodId,
    String rodName,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('낚시대 삭제'),
        content: Text('$rodName 낚시대를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              ref.read(fishingRodProvider.notifier).deleteFishingRod(rodId);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$rodName 낚시대가 삭제되었습니다'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }
}
