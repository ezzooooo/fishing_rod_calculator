import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/brand_provider.dart';
import '../widgets/app_drawer.dart';

class BrandManagementScreen extends ConsumerWidget {
  const BrandManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brands = ref.watch(brandProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('브랜드 관리'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/brands/add'),
            tooltip: '브랜드 추가',
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/brands'),
      body: brands.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.business_outlined, size: 80, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    '등록된 브랜드가 없습니다',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '+ 버튼을 눌러 브랜드를 추가해보세요',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: brands.length,
              itemBuilder: (context, index) {
                final brand = brands[index];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.business)),
                    title: Text(
                      brand.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: brand.createdAt != null
                        ? Text(
                            '등록일: ${brand.createdAt!.year}-${brand.createdAt!.month.toString().padLeft(2, '0')}-${brand.createdAt!.day.toString().padLeft(2, '0')}',
                          )
                        : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () =>
                              context.go('/brands/edit/${brand.id}'),
                          tooltip: '수정',
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _showDeleteDialog(
                            context,
                            ref,
                            brand.id,
                            brand.name,
                          ),
                          tooltip: '삭제',
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _showDeleteDialog(
    BuildContext context,
    WidgetRef ref,
    String brandId,
    String brandName,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('브랜드 삭제'),
        content: Text('$brandName 브랜드를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              ref.read(brandProvider.notifier).deleteBrand(brandId);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$brandName 브랜드가 삭제되었습니다'),
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
