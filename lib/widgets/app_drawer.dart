import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppDrawer extends StatelessWidget {
  final String currentRoute;

  const AppDrawer({super.key, required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          // 헤더
          DrawerHeader(
            decoration: BoxDecoration(color: Theme.of(context).primaryColor),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.sports, size: 64, color: Colors.white),
                SizedBox(height: 8),
                Text(
                  '낚시대 계산기',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          // 메뉴 항목들
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildDrawerItem(
                  context: context,
                  icon: Icons.home,
                  title: '홈 (계산기)',
                  route: '/',
                  isSelected: currentRoute == '/',
                ),
                _buildDrawerItem(
                  context: context,
                  icon: Icons.business,
                  title: '브랜드 관리',
                  route: '/brands',
                  isSelected: currentRoute.startsWith('/brands'),
                ),
                _buildDrawerItem(
                  context: context,
                  icon: Icons.sports,
                  title: '낚시대 관리',
                  route: '/fishing-rods',
                  isSelected: currentRoute.startsWith('/fishing-rods'),
                ),
                const Divider(),
                _buildDrawerItem(
                  context: context,
                  icon: Icons.settings,
                  title: '시스템 설정',
                  route: '/system-settings',
                  isSelected: currentRoute.startsWith('/system-settings'),
                ),
                const Divider(),

                // 정보 섹션
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text(
                    '정보',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('앱 정보'),
                  onTap: () {
                    Navigator.pop(context);
                    _showAppInfo(context);
                  },
                ),
              ],
            ),
          ),

          // 하단 정보
          Container(
            padding: const EdgeInsets.all(16.0),
            child: const Text(
              'Version 1.0.0',
              style: TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String route,
    required bool isSelected,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8.0),
        color: isSelected
            ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
            : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? Theme.of(context).primaryColor : null,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? Theme.of(context).primaryColor : null,
            fontWeight: isSelected ? FontWeight.bold : null,
          ),
        ),
        onTap: () {
          Navigator.pop(context); // Drawer 닫기
          if (!isSelected) {
            context.go(route);
          }
        },
      ),
    );
  }

  void _showAppInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('낚시대 계산기'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('버전: 1.0.0'),
            SizedBox(height: 8),
            Text('개발: Flutter + Riverpod'),
            SizedBox(height: 8),
            Text('기능:'),
            Text('• 브랜드 관리'),
            Text('• 낚시대 관리'),
            Text('• 가격 계산 (매입율 적용)'),
            Text('• 데이터 로컬 저장'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('확인'),
          ),
        ],
      ),
    );
  }
}
