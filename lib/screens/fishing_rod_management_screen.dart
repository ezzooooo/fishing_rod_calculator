import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/fishing_rod_provider.dart';
import '../providers/brand_provider.dart';
import '../models/brand.dart';
import '../widgets/app_drawer.dart';

class FishingRodManagementScreen extends ConsumerWidget {
  const FishingRodManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fishingRods = ref.watch(fishingRodProvider);
    final brands = ref.watch(brandProvider);

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
      body: fishingRods.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.sports_outlined, size: 80, color: Colors.grey),
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
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: fishingRods.length,
              itemBuilder: (context, index) {
                final rod = fishingRods[index];
                final brand = brands.firstWhere(
                  (b) => b.id == rod.brandId,
                  orElse: () => const Brand(id: '', name: '알 수 없음'),
                );

                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.sports)),
                    title: Text(
                      rod.name,
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
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () =>
                              context.go('/fishing-rods/edit/${rod.id}'),
                          tooltip: '수정',
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () =>
                              _showDeleteDialog(context, ref, rod.id, rod.name),
                          tooltip: '삭제',
                        ),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
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
