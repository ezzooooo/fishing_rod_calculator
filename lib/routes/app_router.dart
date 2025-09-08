import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home_screen.dart';
import '../screens/brand_management_screen.dart';
import '../screens/fishing_rod_management_screen.dart';
import '../screens/add_edit_brand_screen.dart';
import '../screens/add_edit_fishing_rod_screen.dart';
import '../screens/system_settings_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    // 홈 화면 (계산기)
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),

    // 브랜드 관리 화면
    GoRoute(
      path: '/brands',
      name: 'brands',
      builder: (context, state) => const BrandManagementScreen(),
      routes: [
        // 브랜드 추가
        GoRoute(
          path: 'add',
          name: 'add-brand',
          builder: (context, state) => const AddEditBrandScreen(),
        ),
        // 브랜드 수정
        GoRoute(
          path: 'edit/:id',
          name: 'edit-brand',
          builder: (context, state) {
            final brandId = state.pathParameters['id']!;
            return AddEditBrandScreen(brandId: brandId);
          },
        ),
      ],
    ),

    // 낚시대 관리 화면
    GoRoute(
      path: '/fishing-rods',
      name: 'fishing-rods',
      builder: (context, state) => const FishingRodManagementScreen(),
      routes: [
        // 낚시대 추가
        GoRoute(
          path: 'add',
          name: 'add-fishing-rod',
          builder: (context, state) => const AddEditFishingRodScreen(),
        ),
        // 낚시대 수정
        GoRoute(
          path: 'edit/:id',
          name: 'edit-fishing-rod',
          builder: (context, state) {
            final fishingRodId = state.pathParameters['id']!;
            return AddEditFishingRodScreen(fishingRodId: fishingRodId);
          },
        ),
      ],
    ),

    // 시스템 설정 화면
    GoRoute(
      path: '/system-settings',
      name: 'system-settings',
      builder: (context, state) => const SystemSettingsScreen(),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    appBar: AppBar(title: const Text('오류')),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            '페이지를 찾을 수 없습니다',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            '경로: ${state.uri}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.go('/'),
            child: const Text('홈으로 돌아가기'),
          ),
        ],
      ),
    ),
  ),
);
