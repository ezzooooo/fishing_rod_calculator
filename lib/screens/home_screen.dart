import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/fishing_rod_provider.dart';
import '../providers/brand_provider.dart';
import '../providers/calculation_provider.dart';
import '../models/fishing_rod.dart';
import '../models/brand.dart';
import '../models/calculation_item.dart';
import '../widgets/app_drawer.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();
  FishingRod? _selectedRod;
  String _searchQuery = '';
  final Map<int, TextEditingController> _quantityControllers = {};
  final Map<int, FocusNode> _quantityFocusNodes = {};

  @override
  void dispose() {
    _searchController.dispose();
    // 수량 컨트롤러들과 포커스 노드들 정리
    for (var controller in _quantityControllers.values) {
      controller.dispose();
    }
    for (var focusNode in _quantityFocusNodes.values) {
      focusNode.dispose();
    }
    super.dispose();
  }

  void _initializeQuantityControllers(FishingRod rod) {
    // 기존 컨트롤러들 정리
    for (var controller in _quantityControllers.values) {
      controller.dispose();
    }
    for (var focusNode in _quantityFocusNodes.values) {
      focusNode.dispose();
    }
    _quantityControllers.clear();
    _quantityFocusNodes.clear();

    // 새로운 컨트롤러들 생성
    for (int length in rod.availableLengths) {
      _quantityControllers[length] = TextEditingController(text: '0');
      _quantityFocusNodes[length] = FocusNode();
    }
  }

  void _focusNextQuantityField(int currentLength, List<int> sortedLengths) {
    final currentIndex = sortedLengths.indexOf(currentLength);
    if (currentIndex < sortedLengths.length - 1) {
      final nextLength = sortedLengths[currentIndex + 1];
      _quantityFocusNodes[nextLength]?.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final fishingRods = ref.watch(fishingRodProvider);
    final brands = ref.watch(brandProvider);
    final calculations = ref.watch(calculationProvider);
    final totalQuantity = ref.watch(totalQuantityProvider);
    final totalOriginalPrice = ref.watch(totalOriginalPriceProvider);
    final totalFinalPrice = ref.watch(totalFinalPriceProvider);

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
        title: const Text('낚시대 계산기'),
        actions: [
          if (calculations.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_all),
              onPressed: () => _showClearAllDialog(),
              tooltip: '전체 삭제',
            ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/'),
      body: fishingRods.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.sports_outlined, size: 120, color: Colors.grey),
                  SizedBox(height: 24),
                  Text(
                    '등록된 낚시대가 없습니다',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    '먼저 브랜드와 낚시대를 등록해주세요',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // 검색 및 선택 영역
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.grey.shade50,
                  child: Column(
                    children: [
                      // 검색 바
                      TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: '낚시대 또는 브랜드명으로 검색',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                    });
                                  },
                                )
                              : null,
                          border: const OutlineInputBorder(),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                            // 검색으로 인해 현재 선택된 낚시대가 필터링되면 선택 해제
                            if (_selectedRod != null) {
                              final filteredRods = fishingRods.where((rod) {
                                final brand = brands.firstWhere(
                                  (b) => b.id == rod.brandId,
                                  orElse: () =>
                                      const Brand(id: '', name: '알 수 없음'),
                                );
                                final searchLower = _searchQuery.toLowerCase();
                                return rod.name.toLowerCase().contains(
                                      searchLower,
                                    ) ||
                                    brand.name.toLowerCase().contains(
                                      searchLower,
                                    );
                              }).toList();

                              if (!filteredRods.contains(_selectedRod)) {
                                _selectedRod = null;
                                ref
                                    .read(calculationProvider.notifier)
                                    .clearAll();
                              }
                            }
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      // 낚시대 선택 드롭다운
                      DropdownButtonFormField<FishingRod>(
                        initialValue: filteredRods.contains(_selectedRod)
                            ? _selectedRod
                            : null,
                        decoration: const InputDecoration(
                          labelText: '낚시대 선택',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.sports),
                        ),
                        items: filteredRods.map((rod) {
                          final brand = brands.firstWhere(
                            (b) => b.id == rod.brandId,
                            orElse: () => const Brand(id: '', name: '알 수 없음'),
                          );
                          return DropdownMenuItem(
                            value: rod,
                            child: Text(
                              '[${brand.name}] ${rod.name}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (rod) {
                          setState(() {
                            _selectedRod = rod;
                            // 낚시대 변경 시 기존 계산 데이터 초기화
                            ref.read(calculationProvider.notifier).clearAll();
                            if (rod != null) {
                              _initializeQuantityControllers(rod);
                            }
                          });
                        },
                      ),
                    ],
                  ),
                ),

                // 계산 영역
                if (_selectedRod != null) ...[
                  Expanded(
                    child: Row(
                      children: [
                        // 왼쪽: 칸수별 수량 입력
                        Expanded(
                          flex: 2,
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border(
                                right: BorderSide(color: Colors.grey.shade300),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _selectedRod!.name,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '칸수별 수량 입력 (Tab으로 이동)',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: ListView.builder(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                    ),
                                    itemCount:
                                        (_selectedRod!.availableLengths.toList()
                                              ..sort())
                                            .length,
                                    itemBuilder: (context, index) {
                                      final sortedLengths =
                                          _selectedRod!.availableLengths
                                              .toList()
                                            ..sort();
                                      final length = sortedLengths[index];
                                      final price = _selectedRod!
                                          .getPriceForLength(length);

                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 12,
                                        ),
                                        child: Row(
                                          children: [
                                            // 칸수 라벨
                                            Container(
                                              width: 70,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                    horizontal: 12,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: Colors.blue.shade50,
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: Colors.blue.shade200,
                                                ),
                                              ),
                                              child: Text(
                                                '$length칸',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14,
                                                ),
                                                textAlign: TextAlign.center,
                                              ),
                                            ),
                                            const SizedBox(width: 8),

                                            // 중고가 표시
                                            Container(
                                              width: 80,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                    horizontal: 8,
                                                  ),
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  const Text(
                                                    '중고가:',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                    ),
                                                  ),
                                                  Text(
                                                    '${price.toStringAsFixed(0)}원',
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),

                                            // 수량 입력 필드
                                            Expanded(
                                              child: TextFormField(
                                                controller:
                                                    _quantityControllers[length],
                                                focusNode:
                                                    _quantityFocusNodes[length],
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: '수량',
                                                      hintText: '0',
                                                      border:
                                                          OutlineInputBorder(),
                                                      suffixText: '대',
                                                      isDense: true,
                                                    ),
                                                keyboardType:
                                                    TextInputType.number,
                                                inputFormatters: [
                                                  FilteringTextInputFormatter
                                                      .digitsOnly,
                                                ],
                                                textInputAction:
                                                    TextInputAction.next,
                                                onFieldSubmitted: (_) =>
                                                    _focusNextQuantityField(
                                                      length,
                                                      sortedLengths,
                                                    ),
                                                onChanged: (value) {
                                                  final quantity =
                                                      int.tryParse(value) ?? 0;
                                                  if (quantity > 0) {
                                                    // 계산 항목 추가/업데이트
                                                    ref
                                                        .read(
                                                          calculationProvider
                                                              .notifier,
                                                        )
                                                        .addCalculationItem(
                                                          fishingRodId:
                                                              _selectedRod!.id,
                                                          length: length,
                                                          quantity: quantity,
                                                          discountRate:
                                                              0.7, // 기본 70%
                                                        );
                                                  } else {
                                                    // 수량이 0이면 계산 항목 제거
                                                    ref
                                                        .read(
                                                          calculationProvider
                                                              .notifier,
                                                        )
                                                        .removeCalculationItem(
                                                          _selectedRod!.id,
                                                          length,
                                                        );
                                                  }
                                                },
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // 오른쪽: 계산 결과
                        Expanded(
                          flex: 3,
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '계산 결과',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Expanded(
                                  child:
                                      calculations
                                          .where(
                                            (c) =>
                                                c.fishingRodId ==
                                                _selectedRod!.id,
                                          )
                                          .isEmpty
                                      ? const Center(
                                          child: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                Icons.calculate_outlined,
                                                size: 80,
                                                color: Colors.grey,
                                              ),
                                              SizedBox(height: 16),
                                              Text(
                                                '왼쪽에서 수량을 입력하여 계산을 시작하세요',
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  color: Colors.grey,
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      : ListView.builder(
                                          padding: const EdgeInsets.all(16),
                                          itemCount: calculations
                                              .where(
                                                (c) =>
                                                    c.fishingRodId ==
                                                    _selectedRod!.id,
                                              )
                                              .length,
                                          itemBuilder: (context, index) {
                                            final calculation = calculations
                                                .where(
                                                  (c) =>
                                                      c.fishingRodId ==
                                                      _selectedRod!.id,
                                                )
                                                .toList()[index];
                                            final rodPrice = _selectedRod!
                                                .getPriceForLength(
                                                  calculation.length,
                                                );
                                            final originalPrice = calculation
                                                .getTotalPrice(rodPrice);
                                            final finalPrice = calculation
                                                .getFinalPrice(rodPrice);

                                            return Card(
                                              child: Padding(
                                                padding: const EdgeInsets.all(
                                                  16,
                                                ),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Row(
                                                      mainAxisAlignment:
                                                          MainAxisAlignment
                                                              .spaceBetween,
                                                      children: [
                                                        Text(
                                                          '${calculation.length}칸 × ${calculation.quantity}대',
                                                          style:
                                                              const TextStyle(
                                                                fontSize: 16,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold,
                                                              ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 8),
                                                    Row(
                                                      children: [
                                                        const Text('중고가: '),
                                                        Text(
                                                          '${rodPrice.toStringAsFixed(0)}원',
                                                          style:
                                                              const TextStyle(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w500,
                                                              ),
                                                        ),
                                                        const Spacer(),
                                                        const Text('총 원가: '),
                                                        Text(
                                                          '${originalPrice.toStringAsFixed(0)}원',
                                                          style:
                                                              const TextStyle(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold,
                                                              ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 8),
                                                    Row(
                                                      children: [
                                                        const Text('할인율: '),
                                                        ExcludeFocus(
                                                          child: DropdownButton<double>(
                                                            value: calculation
                                                                .discountRate,
                                                            items:
                                                                [
                                                                  0.4,
                                                                  0.45,
                                                                  0.5,
                                                                  0.55,
                                                                  0.6,
                                                                  0.65,
                                                                  0.7,
                                                                ].map((rate) {
                                                                  return DropdownMenuItem(
                                                                    value: rate,
                                                                    child: Text(
                                                                      '${(rate * 100).toInt()}%',
                                                                    ),
                                                                  );
                                                                }).toList(),
                                                            onChanged: (rate) {
                                                              if (rate !=
                                                                  null) {
                                                                ref
                                                                    .read(
                                                                      calculationProvider
                                                                          .notifier,
                                                                    )
                                                                    .updateDiscountRate(
                                                                      _selectedRod!
                                                                          .id,
                                                                      calculation
                                                                          .length,
                                                                      rate,
                                                                    );
                                                              }
                                                            },
                                                          ),
                                                        ),
                                                        const Spacer(),
                                                        const Text('최종 가격: '),
                                                        Text(
                                                          '${finalPrice.toStringAsFixed(0)}원',
                                                          style:
                                                              const TextStyle(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold,
                                                                color: Colors
                                                                    .green,
                                                                fontSize: 16,
                                                              ),
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            );
                                          },
                                        ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 하단: 총합 정보
                if (calculations.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      border: Border(
                        top: BorderSide(color: Colors.grey.shade300),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Column(
                          children: [
                            const Text(
                              '총 대수',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '$totalQuantity대',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          children: [
                            const Text(
                              '총 원가',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${totalOriginalPrice.toStringAsFixed(0)}원',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          children: [
                            const Text(
                              '총 최종 가격',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${totalFinalPrice.toStringAsFixed(0)}원',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }

  void _showClearAllDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('전체 삭제'),
        content: const Text('모든 계산 내역을 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              ref.read(calculationProvider.notifier).clearAll();
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }
}
