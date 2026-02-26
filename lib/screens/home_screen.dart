import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
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
  static const double _mobileLayoutBreakpoint = 900;

  final _searchController = TextEditingController();
  FishingRod? _selectedRod;
  String _searchQuery = '';
  final Map<int, TextEditingController> _quantityControllers = {};
  final Map<int, FocusNode> _quantityFocusNodes = {};
  Timer? _debounceTimer;

  // 숫자 포맷터 (3자리마다 콤마)
  final NumberFormat _numberFormat = NumberFormat('#,###');

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
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
    // 기존 값들을 임시로 저장
    final Map<int, String> existingValues = {};
    for (var entry in _quantityControllers.entries) {
      existingValues[entry.key] = entry.value.text;
    }

    // 기존 컨트롤러들 정리
    for (var controller in _quantityControllers.values) {
      controller.dispose();
    }
    for (var focusNode in _quantityFocusNodes.values) {
      focusNode.dispose();
    }
    _quantityControllers.clear();
    _quantityFocusNodes.clear();

    // 새로운 컨트롤러들 생성 (기존 값이 있으면 유지, 없으면 0)
    for (int length in rod.availableLengths) {
      final existingValue = existingValues[length] ?? '0';
      _quantityControllers[length] = TextEditingController(text: existingValue);
      _quantityFocusNodes[length] = FocusNode();

      // 기존 수량 값이 0보다 크면 계산 데이터에 추가
      final quantity = int.tryParse(existingValue) ?? 0;
      if (quantity > 0) {
        ref
            .read(calculationProvider.notifier)
            .addCalculationItem(
              fishingRodId: rod.id,
              length: length,
              quantity: quantity,
              discountRate: 0.7, // 기본 70%
            );
      }
    }
  }

  void _focusNextQuantityField(int currentLength, List<int> sortedLengths) {
    final currentIndex = sortedLengths.indexOf(currentLength);
    if (currentIndex < sortedLengths.length - 1) {
      final nextLength = sortedLengths[currentIndex + 1];
      _quantityFocusNodes[nextLength]?.requestFocus();
    }
  }

  void _updateSearchQuery(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        _searchQuery = query.trim();
      });
    });
  }

  void _clearQuantityInputs() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('수량 초기화'),
        content: const Text('모든 칸수의 입력된 수량을 초기화하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                // 모든 수량 입력 필드를 0으로 초기화
                for (var controller in _quantityControllers.values) {
                  controller.text = '0';
                }
                // 계산 데이터도 초기화
                ref.read(calculationProvider.notifier).clearAll();
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('모든 수량이 초기화되었습니다'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.orange),
            child: const Text('초기화'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isMobileLayout =
        MediaQuery.sizeOf(context).width < _mobileLayoutBreakpoint;
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
      floatingActionButton: calculations.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => _showPrintDialog(),
              icon: const Icon(Icons.print),
              label: const Text('인쇄 미리보기'),
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            )
          : null,
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
                if (!isMobileLayout || _selectedRod == null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    color: Colors.grey.shade50,
                    child: Column(
                      children: [
                        // 검색 바
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
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),

                        // 낚시대 선택 드롭다운
                        if (isMobileLayout)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              DropdownButtonFormField<FishingRod>(
                                initialValue:
                                    filteredRods.contains(_selectedRod)
                                    ? _selectedRod
                                    : null,
                                decoration: const InputDecoration(
                                  labelText: '낚시대 선택',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.sports),
                                ),
                                menuMaxHeight: 300, // 드롭다운 최대 높이 설정
                                items: filteredRods.map((rod) {
                                  final brand = brands.firstWhere(
                                    (b) => b.id == rod.brandId,
                                    orElse: () =>
                                        const Brand(id: '', name: '알 수 없음'),
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
                                    // 낚시대 변경 시 칸수 입력은 유지하고 계산 데이터만 초기화
                                    ref
                                        .read(calculationProvider.notifier)
                                        .clearAll();
                                    if (rod != null) {
                                      _initializeQuantityControllers(rod);
                                    }
                                  });
                                },
                              ),
                              if (_selectedRod != null) ...[
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: IconButton(
                                    onPressed: _clearQuantityInputs,
                                    icon: const Icon(Icons.refresh),
                                    tooltip: '수량 초기화',
                                    style: IconButton.styleFrom(
                                      foregroundColor: Colors.orange,
                                      backgroundColor: Colors.orange.withAlpha(
                                        25,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: DropdownButtonFormField<FishingRod>(
                                  initialValue:
                                      filteredRods.contains(_selectedRod)
                                      ? _selectedRod
                                      : null,
                                  decoration: const InputDecoration(
                                    labelText: '낚시대 선택',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.sports),
                                  ),
                                  menuMaxHeight: 300, // 드롭다운 최대 높이 설정
                                  items: filteredRods.map((rod) {
                                    final brand = brands.firstWhere(
                                      (b) => b.id == rod.brandId,
                                      orElse: () =>
                                          const Brand(id: '', name: '알 수 없음'),
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
                                      // 낚시대 변경 시 칸수 입력은 유지하고 계산 데이터만 초기화
                                      ref
                                          .read(calculationProvider.notifier)
                                          .clearAll();
                                      if (rod != null) {
                                        _initializeQuantityControllers(rod);
                                      }
                                    });
                                  },
                                ),
                              ),
                              if (_selectedRod != null) ...[
                                const SizedBox(width: 8),
                                IconButton(
                                  onPressed: _clearQuantityInputs,
                                  icon: const Icon(Icons.refresh),
                                  tooltip: '수량 초기화',
                                  style: IconButton.styleFrom(
                                    foregroundColor: Colors.orange,
                                    backgroundColor: Colors.orange.withAlpha(
                                      25,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                      ],
                    ),
                  ),

                // 계산 영역
                if (_selectedRod != null) ...[
                  Expanded(
                    child: Flex(
                      direction: isMobileLayout
                          ? Axis.vertical
                          : Axis.horizontal,
                      children: [
                        // 왼쪽: 칸수별 수량 입력
                        Expanded(
                          flex: 2,
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border(
                                right: isMobileLayout
                                    ? BorderSide.none
                                    : BorderSide(color: Colors.grey.shade300),
                                bottom: isMobileLayout
                                    ? BorderSide(color: Colors.grey.shade300)
                                    : BorderSide.none,
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
                                        isMobileLayout
                                            ? '칸수별 수량 입력'
                                            : '칸수별 수량 입력 (Tab으로 이동)',
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
                                              width: isMobileLayout ? 62 : 70,
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
                                              width: isMobileLayout ? 74 : 80,
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
                                                    '${_numberFormat.format(price.toInt())}원',
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
                            padding: EdgeInsets.all(isMobileLayout ? 12 : 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (isMobileLayout)
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        '계산 결과',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (calculations
                                          .where(
                                            (c) =>
                                                c.fishingRodId ==
                                                _selectedRod!.id,
                                          )
                                          .isNotEmpty)
                                        TextButton.icon(
                                          onPressed:
                                              _showBulkDiscountRateDialog,
                                          icon: const Icon(
                                            Icons.tune,
                                            size: 16,
                                          ),
                                          label: const Text('일괄 매입율'),
                                          style: TextButton.styleFrom(
                                            foregroundColor: Colors.blue,
                                          ),
                                        ),
                                    ],
                                  )
                                else
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        '계산 결과',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (calculations
                                          .where(
                                            (c) =>
                                                c.fishingRodId ==
                                                _selectedRod!.id,
                                          )
                                          .isNotEmpty)
                                        TextButton.icon(
                                          onPressed:
                                              _showBulkDiscountRateDialog,
                                          icon: const Icon(
                                            Icons.tune,
                                            size: 16,
                                          ),
                                          label: const Text('일괄 매입율'),
                                          style: TextButton.styleFrom(
                                            foregroundColor: Colors.blue,
                                          ),
                                        ),
                                    ],
                                  ),
                                SizedBox(height: isMobileLayout ? 8 : 16),
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
                                      : SingleChildScrollView(
                                          padding: const EdgeInsets.all(8),
                                          child: SingleChildScrollView(
                                            scrollDirection: Axis.horizontal,
                                            child: ConstrainedBox(
                                              constraints: BoxConstraints(
                                                minWidth: isMobileLayout
                                                    ? 820
                                                    : 0,
                                              ),
                                              child: DataTable(
                                                columnSpacing: 16,
                                                horizontalMargin: 12,
                                                headingRowHeight: 55,
                                                dataRowMinHeight: 45,
                                                dataRowMaxHeight: 45,
                                                border: TableBorder.all(
                                                  color: Colors.grey.shade300,
                                                  width: 1,
                                                ),
                                                headingRowColor:
                                                    WidgetStateProperty.all(
                                                      Colors.blue.shade50,
                                                    ),
                                                columns: const [
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '칸수',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '수량',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '중고가',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '총 평균거래가',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '매입율',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataColumn(
                                                    label: Expanded(
                                                      child: Text(
                                                        '최종 매입가',
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 15,
                                                          color: Colors.blue,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                                rows:
                                                    (calculations
                                                            .where(
                                                              (c) =>
                                                                  c.fishingRodId ==
                                                                  _selectedRod!
                                                                      .id,
                                                            )
                                                            .toList()
                                                          ..sort(
                                                            (a, b) => a.length
                                                                .compareTo(
                                                                  b.length,
                                                                ),
                                                          ))
                                                        .map((calculation) {
                                                          final rodPrice =
                                                              _selectedRod!
                                                                  .getPriceForLength(
                                                                    calculation
                                                                        .length,
                                                                  );
                                                          final originalPrice =
                                                              calculation
                                                                  .getTotalPrice(
                                                                    rodPrice,
                                                                  );
                                                          final finalPrice =
                                                              calculation
                                                                  .getFinalPrice(
                                                                    rodPrice,
                                                                  );

                                                          return DataRow(
                                                            cells: [
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: Text(
                                                                    '${calculation.length}칸',
                                                                    style: const TextStyle(
                                                                      fontSize:
                                                                          15,
                                                                      fontWeight:
                                                                          FontWeight
                                                                              .w500,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: Text(
                                                                    '${calculation.quantity}대',
                                                                    style: const TextStyle(
                                                                      fontSize:
                                                                          15,
                                                                      fontWeight:
                                                                          FontWeight
                                                                              .w500,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: Text(
                                                                    '${_numberFormat.format(rodPrice.toInt())}원',
                                                                    style: const TextStyle(
                                                                      fontSize:
                                                                          15,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: Text(
                                                                    '${_numberFormat.format(originalPrice.toInt())}원',
                                                                    style: const TextStyle(
                                                                      fontSize:
                                                                          15,
                                                                      fontWeight:
                                                                          FontWeight
                                                                              .bold,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: ExcludeFocus(
                                                                    child: DropdownButton<double>(
                                                                      value: calculation
                                                                          .discountRate,
                                                                      isDense:
                                                                          true,
                                                                      underline:
                                                                          Container(),
                                                                      style: const TextStyle(
                                                                        fontSize:
                                                                            14,
                                                                        color: Colors
                                                                            .black87,
                                                                      ),
                                                                      items:
                                                                          [
                                                                            0.4,
                                                                            0.45,
                                                                            0.5,
                                                                            0.55,
                                                                            0.6,
                                                                            0.65,
                                                                            0.7,
                                                                          ].map((
                                                                            rate,
                                                                          ) {
                                                                            return DropdownMenuItem(
                                                                              value: rate,
                                                                              child: Text(
                                                                                '${(rate * 100).toInt()}%',
                                                                                style: const TextStyle(
                                                                                  fontSize: 14,
                                                                                ),
                                                                              ),
                                                                            );
                                                                          }).toList(),
                                                                      onChanged: (rate) {
                                                                        if (rate !=
                                                                            null) {
                                                                          ref
                                                                              .read(
                                                                                calculationProvider.notifier,
                                                                              )
                                                                              .updateDiscountRate(
                                                                                _selectedRod!.id,
                                                                                calculation.length,
                                                                                rate,
                                                                              );
                                                                        }
                                                                      },
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                              DataCell(
                                                                Container(
                                                                  padding:
                                                                      const EdgeInsets.symmetric(
                                                                        horizontal:
                                                                            8,
                                                                      ),
                                                                  alignment:
                                                                      Alignment
                                                                          .centerRight,
                                                                  child: Text(
                                                                    '${_numberFormat.format(finalPrice.toInt())}원',
                                                                    style: const TextStyle(
                                                                      fontSize:
                                                                          17,
                                                                      fontWeight:
                                                                          FontWeight
                                                                              .bold,
                                                                      color: Colors
                                                                          .blue,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                            ],
                                                          );
                                                        })
                                                        .toList(),
                                              ),
                                            ),
                                          ),
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
                    child: Wrap(
                      alignment: WrapAlignment.spaceEvenly,
                      runSpacing: 12,
                      spacing: isMobileLayout ? 12 : 24,
                      children: [
                        SizedBox(
                          width: isMobileLayout ? 150 : 220,
                          child: Column(
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
                        ),
                        SizedBox(
                          width: isMobileLayout ? 150 : 220,
                          child: Column(
                            children: [
                              const Text(
                                '총 평균거래가',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '${_numberFormat.format(totalOriginalPrice.toInt())}원',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: isMobileLayout ? 150 : 220,
                          child: Column(
                            children: [
                              const Text(
                                '총 최종매입가',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '${_numberFormat.format(totalFinalPrice.toInt())}원',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                            ],
                          ),
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

  void _showBulkDiscountRateDialog() {
    double? selectedRate;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('일괄 매입율 설정'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                '선택된 낚시대의 모든 칸수에 동일한 매입율을 적용합니다.',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<double>(
                decoration: const InputDecoration(
                  labelText: '매입율 선택',
                  border: OutlineInputBorder(),
                ),
                initialValue: selectedRate,
                items: [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7].map((rate) {
                  return DropdownMenuItem(
                    value: rate,
                    child: Text('${(rate * 100).toInt()}%'),
                  );
                }).toList(),
                onChanged: (rate) {
                  setState(() {
                    selectedRate = rate;
                  });
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: selectedRate == null
                  ? null
                  : () {
                      // 선택된 낚시대의 모든 계산 항목에 매입율 적용
                      final currentCalculations = ref
                          .read(calculationProvider)
                          .where((c) => c.fishingRodId == _selectedRod!.id)
                          .toList();

                      for (final calculation in currentCalculations) {
                        ref
                            .read(calculationProvider.notifier)
                            .updateDiscountRate(
                              _selectedRod!.id,
                              calculation.length,
                              selectedRate!,
                            );
                      }

                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '모든 칸수에 ${(selectedRate! * 100).toInt()}% 매입율이 적용되었습니다',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
              style: TextButton.styleFrom(
                foregroundColor: selectedRate == null ? null : Colors.blue,
              ),
              child: const Text('적용'),
            ),
          ],
        ),
      ),
    );
  }

  Future<pw.Document> _generatePdf() async {
    final calculations = ref.read(calculationProvider);
    final currentCalculations =
        calculations.where((c) => c.fishingRodId == _selectedRod!.id).toList()
          ..sort((a, b) => a.length.compareTo(b.length));

    final totalOriginalPrice = ref.read(totalOriginalPriceProvider);
    final totalFinalPrice = ref.read(totalFinalPriceProvider);
    final totalQuantity = ref.read(totalQuantityProvider);

    final font = await PdfGoogleFonts.notoSansKRMedium();
    final boldFont = await PdfGoogleFonts.notoSansKRBold();

    final pdf = pw.Document();

    // 데이터 행 수에 따른 동적 폰트 크기 계산
    final int totalRows = currentCalculations.length + 2; // 헤더 + 총계 행 포함
    double titleFontSize = 18;
    double headerFontSize = 12;
    double dataFontSize = 11;
    double cellPadding = 8;

    // 행이 많을수록 폰트 크기와 패딩을 줄임
    if (totalRows > 30) {
      titleFontSize = 14;
      headerFontSize = 9;
      dataFontSize = 8;
      cellPadding = 4;
    } else if (totalRows > 20) {
      titleFontSize = 16;
      headerFontSize = 10;
      dataFontSize = 9;
      cellPadding = 6;
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(30),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // 제목
              pw.Text(
                '낚시대 계산 결과 - ${_selectedRod!.name}',
                style: pw.TextStyle(
                  fontSize: titleFontSize,
                  fontWeight: pw.FontWeight.bold,
                  font: boldFont,
                ),
              ),
              pw.SizedBox(height: totalRows > 30 ? 10 : 15),

              // 테이블
              pw.Expanded(
                child: pw.Table(
                  border: pw.TableBorder.all(color: PdfColors.grey400),
                  columnWidths: {
                    0: const pw.FlexColumnWidth(1),
                    1: const pw.FlexColumnWidth(1),
                    2: const pw.FlexColumnWidth(1.5),
                    3: const pw.FlexColumnWidth(1.5),
                    4: const pw.FlexColumnWidth(1),
                    5: const pw.FlexColumnWidth(1.5),
                  },
                  children: [
                    _buildHeaderRow(
                      font,
                      boldFont,
                      headerFontSize,
                      cellPadding,
                    ),
                    ...currentCalculations.map(
                      (calculation) => _buildDataRow(
                        calculation,
                        font,
                        dataFontSize,
                        cellPadding,
                      ),
                    ),
                    _buildTotalRow(
                      totalQuantity,
                      totalOriginalPrice,
                      totalFinalPrice,
                      font,
                      boldFont,
                      headerFontSize,
                      cellPadding,
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: totalRows > 30 ? 5 : 10),

              // 생성 시간
              pw.Text(
                '생성일시: ${DateTime.now().toString().substring(0, 19)}',
                style: pw.TextStyle(
                  fontSize: totalRows > 30 ? 8 : 10,
                  color: PdfColors.grey600,
                  font: font,
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }

  pw.TableRow _buildHeaderRow(
    pw.Font font,
    pw.Font boldFont,
    double fontSize,
    double padding,
  ) {
    return pw.TableRow(
      decoration: const pw.BoxDecoration(color: PdfColors.blue100),
      children: [
        _buildPdfCell(
          '칸수',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '수량',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '중고가',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '총 평균거래가',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '매입율',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '최종 매입가',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
      ],
    );
  }

  pw.TableRow _buildDataRow(
    CalculationItem calculation,
    pw.Font font,
    double fontSize,
    double padding,
  ) {
    final rodPrice = _selectedRod!.getPriceForLength(calculation.length);
    final originalPrice = calculation.getTotalPrice(rodPrice);
    final finalPrice = calculation.getFinalPrice(rodPrice);

    return pw.TableRow(
      children: [
        _buildPdfCell(
          '${calculation.length}칸',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${calculation.quantity}대',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${_numberFormat.format(rodPrice.toInt())}원',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${_numberFormat.format(originalPrice.toInt())}원',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${(calculation.discountRate * 100).toInt()}%',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${_numberFormat.format(finalPrice.toInt())}원',
          font: font,
          fontSize: fontSize,
          padding: padding,
        ),
      ],
    );
  }

  pw.TableRow _buildTotalRow(
    int totalQuantity,
    double totalOriginalPrice,
    double totalFinalPrice,
    pw.Font font,
    pw.Font boldFont,
    double fontSize,
    double padding,
  ) {
    return pw.TableRow(
      decoration: const pw.BoxDecoration(color: PdfColors.blue100),
      children: [
        _buildPdfCell(
          '총계',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '$totalQuantity대',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '-',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${_numberFormat.format(totalOriginalPrice.toInt())}원',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '-',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
        _buildPdfCell(
          '${_numberFormat.format(totalFinalPrice.toInt())}원',
          isHeader: true,
          font: font,
          boldFont: boldFont,
          fontSize: fontSize,
          padding: padding,
        ),
      ],
    );
  }

  pw.Widget _buildPdfCell(
    String text, {
    bool isHeader = false,
    pw.Font? font,
    pw.Font? boldFont,
    double? fontSize,
    double? padding,
  }) {
    return pw.Container(
      padding: pw.EdgeInsets.all(padding ?? 8),
      alignment: isHeader ? pw.Alignment.center : pw.Alignment.centerRight,
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: fontSize ?? (isHeader ? 12 : 11),
          fontWeight: isHeader ? pw.FontWeight.bold : pw.FontWeight.normal,
          font: isHeader ? (boldFont ?? font) : font,
        ),
      ),
    );
  }

  static const int _printPreviewSplitThreshold = 11;

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('yyyy-MM-dd HH:mm:ss').format(dateTime);
  }

  Widget _buildPrintPreviewInfoChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.blue.shade100),
        borderRadius: BorderRadius.circular(8),
      ),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 12, color: Colors.black87),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }

  Widget _buildPrintPreviewInfoCard({
    required FishingRod selectedRod,
    required String brandName,
    required int dataRowCount,
    required String lengthRangeText,
    required int totalQuantity,
    required double totalFinalPrice,
    required DateTime generatedAt,
    required bool isSplitLayout,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '인쇄 미리보기',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              _buildPrintPreviewInfoChip('브랜드', brandName),
              _buildPrintPreviewInfoChip('낚시대', selectedRod.name),
              _buildPrintPreviewInfoChip('칸수 범위', lengthRangeText),
              _buildPrintPreviewInfoChip('데이터 행', '$dataRowCount행'),
              _buildPrintPreviewInfoChip('총 수량', '$totalQuantity대'),
              _buildPrintPreviewInfoChip(
                '총 최종 매입가',
                '${_numberFormat.format(totalFinalPrice.toInt())}원',
              ),
              _buildPrintPreviewInfoChip('생성일시', _formatDateTime(generatedAt)),
              if (isSplitLayout)
                _buildPrintPreviewInfoChip(
                  '레이아웃',
                  '$_printPreviewSplitThreshold행 초과로 좌/우 분할',
                ),
            ],
          ),
        ],
      ),
    );
  }

  DataCell _buildPrintPreviewCell(
    String text, {
    required double fontSize,
    EdgeInsetsGeometry padding = const EdgeInsets.symmetric(horizontal: 8),
    FontWeight fontWeight = FontWeight.normal,
    Color? color,
    double? width,
    bool scaleDown = false,
  }) {
    final textWidget = Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.visible,
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
      ),
    );

    final fittedWidget = scaleDown
        ? FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerRight,
            child: textWidget,
          )
        : textWidget;

    return DataCell(
      Container(
        padding: padding,
        alignment: Alignment.centerRight,
        child: width == null
            ? fittedWidget
            : SizedBox(width: width, child: fittedWidget),
      ),
    );
  }

  DataRow _buildPrintPreviewDataRow(
    CalculationItem calculation,
    FishingRod selectedRod, {
    required double bodyFontSize,
    required double emphasizedFontSize,
    required EdgeInsetsGeometry cellPadding,
    List<double>? columnWidths,
  }) {
    final rodPrice = selectedRod.getPriceForLength(calculation.length);
    final originalPrice = calculation.getTotalPrice(rodPrice);
    final finalPrice = calculation.getFinalPrice(rodPrice);

    return DataRow(
      cells: [
        _buildPrintPreviewCell(
          '${calculation.length}칸',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.w600,
          width: columnWidths?[0],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${calculation.quantity}대',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.w600,
          width: columnWidths?[1],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${_numberFormat.format(rodPrice.toInt())}원',
          fontSize: bodyFontSize,
          padding: cellPadding,
          width: columnWidths?[2],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${_numberFormat.format(originalPrice.toInt())}원',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          width: columnWidths?[3],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${(calculation.discountRate * 100).toInt()}%',
          fontSize: bodyFontSize,
          padding: cellPadding,
          width: columnWidths?[4],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${_numberFormat.format(finalPrice.toInt())}원',
          fontSize: emphasizedFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          color: Colors.blue.shade700,
          width: columnWidths?[5],
          scaleDown: columnWidths != null,
        ),
      ],
    );
  }

  DataRow _buildPrintPreviewTotalRow({
    required int totalQuantity,
    required double totalOriginalPrice,
    required double totalFinalPrice,
    required double bodyFontSize,
    required double emphasizedFontSize,
    required EdgeInsetsGeometry cellPadding,
    List<double>? columnWidths,
  }) {
    return DataRow(
      color: WidgetStateProperty.all(Colors.blue.shade100),
      cells: [
        _buildPrintPreviewCell(
          '총계',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          width: columnWidths?[0],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '$totalQuantity대',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          width: columnWidths?[1],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '-',
          fontSize: bodyFontSize,
          padding: cellPadding,
          width: columnWidths?[2],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${_numberFormat.format(totalOriginalPrice.toInt())}원',
          fontSize: bodyFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          width: columnWidths?[3],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '-',
          fontSize: bodyFontSize,
          padding: cellPadding,
          width: columnWidths?[4],
          scaleDown: columnWidths != null,
        ),
        _buildPrintPreviewCell(
          '${_numberFormat.format(totalFinalPrice.toInt())}원',
          fontSize: emphasizedFontSize,
          padding: cellPadding,
          fontWeight: FontWeight.bold,
          color: Colors.blue.shade700,
          width: columnWidths?[5],
          scaleDown: columnWidths != null,
        ),
      ],
    );
  }

  List<DataColumn> _buildPrintPreviewColumns(
    double headerFontSize, {
    List<double>? columnWidths,
  }) {
    final headerStyle = TextStyle(
      fontWeight: FontWeight.bold,
      fontSize: headerFontSize,
    );
    final labels = <String>['칸수', '수량', '중고가', '총 평균거래가', '매입율', '최종 매입가'];

    return List<DataColumn>.generate(labels.length, (index) {
      final textStyle = index == 5
          ? headerStyle.copyWith(color: Colors.blue.shade700)
          : headerStyle;
      final baseLabel = Text(
        labels[index],
        textAlign: TextAlign.center,
        style: textStyle,
      );

      final labelWidget = columnWidths == null
          ? baseLabel
          : SizedBox(
              width: columnWidths[index],
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.center,
                child: baseLabel,
              ),
            );

      return DataColumn(label: labelWidget);
    });
  }

  Widget _buildPrintPreviewTable({
    required List<CalculationItem> calculations,
    required FishingRod selectedRod,
    required int totalQuantity,
    required double totalOriginalPrice,
    required double totalFinalPrice,
    required bool includeTotalRow,
    required bool compact,
    bool forceFitWidth = false,
  }) {
    final useTightColumnLayout = forceFitWidth;
    final headerFontSize = useTightColumnLayout
        ? 15.0
        : (compact ? 12.0 : 15.0);
    final bodyFontSize = useTightColumnLayout ? 15.0 : (compact ? 12.0 : 15.0);
    final emphasizedFontSize = useTightColumnLayout
        ? 17.0
        : (compact ? 13.0 : 17.0);
    final headingRowHeight = useTightColumnLayout
        ? 47.0
        : (compact ? 48.0 : 55.0);
    final dataRowHeight = useTightColumnLayout ? 42.0 : (compact ? 40.0 : 45.0);
    final columnSpacing = useTightColumnLayout ? 2.0 : (compact ? 10.0 : 16.0);
    final horizontalMargin = useTightColumnLayout
        ? 2.0
        : (compact ? 8.0 : 12.0);
    final cellPadding = EdgeInsets.symmetric(
      horizontal: useTightColumnLayout ? 1 : (compact ? 4 : 8),
    );
    final columnWidths = useTightColumnLayout
        ? const <double>[42, 42, 66, 88, 52, 88]
        : null;

    final table = DataTable(
      columnSpacing: columnSpacing,
      horizontalMargin: horizontalMargin,
      headingRowHeight: headingRowHeight,
      dataRowMinHeight: dataRowHeight,
      dataRowMaxHeight: dataRowHeight,
      border: TableBorder.all(color: Colors.grey.shade300, width: 1),
      headingRowColor: WidgetStateProperty.all(Colors.blue.shade50),
      columns: _buildPrintPreviewColumns(
        headerFontSize,
        columnWidths: columnWidths,
      ),
      rows: [
        ...calculations.map(
          (calculation) => _buildPrintPreviewDataRow(
            calculation,
            selectedRod,
            bodyFontSize: bodyFontSize,
            emphasizedFontSize: emphasizedFontSize,
            cellPadding: cellPadding,
            columnWidths: columnWidths,
          ),
        ),
        if (includeTotalRow)
          _buildPrintPreviewTotalRow(
            totalQuantity: totalQuantity,
            totalOriginalPrice: totalOriginalPrice,
            totalFinalPrice: totalFinalPrice,
            bodyFontSize: bodyFontSize,
            emphasizedFontSize: emphasizedFontSize,
            cellPadding: cellPadding,
            columnWidths: columnWidths,
          ),
      ],
    );

    if (useTightColumnLayout) {
      return table;
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 760),
        child: table,
      ),
    );
  }

  void _showPrintDialog() {
    final selectedRod = _selectedRod;
    if (selectedRod == null) {
      return;
    }

    final calculations = ref.read(calculationProvider);
    final currentCalculations =
        calculations.where((c) => c.fishingRodId == selectedRod.id).toList()
          ..sort((a, b) => a.length.compareTo(b.length));
    final brands = ref.read(brandProvider);
    final brand = brands.firstWhere(
      (item) => item.id == selectedRod.brandId,
      orElse: () => const Brand(id: '', name: '알 수 없음'),
    );

    int totalQuantity = 0;
    double totalOriginalPrice = 0;
    double totalFinalPrice = 0;
    for (final calculation in currentCalculations) {
      final rodPrice = selectedRod.getPriceForLength(calculation.length);
      totalQuantity += calculation.quantity;
      totalOriginalPrice += calculation.getTotalPrice(rodPrice);
      totalFinalPrice += calculation.getFinalPrice(rodPrice);
    }

    final generatedAt = DateTime.now();
    final isSplitLayout =
        currentCalculations.length > _printPreviewSplitThreshold;
    final splitIndex = (currentCalculations.length / 2).ceil();
    final leftCalculations = isSplitLayout
        ? currentCalculations.sublist(0, splitIndex)
        : currentCalculations;
    final rightCalculations = isSplitLayout
        ? currentCalculations.sublist(splitIndex)
        : const <CalculationItem>[];

    final String lengthRangeText;
    if (currentCalculations.isEmpty) {
      lengthRangeText = '-';
    } else {
      final minLength = currentCalculations.first.length;
      final maxLength = currentCalculations.last.length;
      lengthRangeText = minLength == maxLength
          ? '$minLength칸'
          : '$minLength칸 ~ $maxLength칸';
    }

    showDialog(
      context: context,
      builder: (dialogContext) {
        final screenSize = MediaQuery.of(dialogContext).size;
        final isMobileDialog = screenSize.width < 920;
        final effectiveSplitLayout = isSplitLayout && !isMobileDialog;
        final shouldStackSplitTables =
            effectiveSplitLayout && screenSize.width < 1280;
        final dialogWidth = isMobileDialog
            ? (screenSize.width * 0.96)
                  .clamp(320.0, screenSize.width)
                  .toDouble()
            : (screenSize.width * 0.94).clamp(900.0, 1500.0).toDouble();
        final dialogHeight = isMobileDialog
            ? (screenSize.height * 0.94)
                  .clamp(560.0, screenSize.height)
                  .toDouble()
            : (screenSize.height * 0.92).clamp(720.0, 1040.0).toDouble();

        return Dialog(
          backgroundColor: Colors.white,
          insetPadding: EdgeInsets.all(isMobileDialog ? 8 : 24),
          child: SizedBox(
            width: dialogWidth,
            height: dialogHeight,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildPrintPreviewInfoCard(
                    selectedRod: selectedRod,
                    brandName: brand.name,
                    dataRowCount: currentCalculations.length,
                    lengthRangeText: lengthRangeText,
                    totalQuantity: totalQuantity,
                    totalFinalPrice: totalFinalPrice,
                    generatedAt: generatedAt,
                    isSplitLayout: effectiveSplitLayout,
                  ),
                  const SizedBox(height: 12),

                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        children: [
                          if (effectiveSplitLayout)
                            shouldStackSplitTables
                                ? Column(
                                    children: [
                                      _buildPrintPreviewTable(
                                        calculations: leftCalculations,
                                        selectedRod: selectedRod,
                                        totalQuantity: totalQuantity,
                                        totalOriginalPrice: totalOriginalPrice,
                                        totalFinalPrice: totalFinalPrice,
                                        includeTotalRow: false,
                                        compact: true,
                                      ),
                                      const SizedBox(height: 12),
                                      _buildPrintPreviewTable(
                                        calculations: rightCalculations,
                                        selectedRod: selectedRod,
                                        totalQuantity: totalQuantity,
                                        totalOriginalPrice: totalOriginalPrice,
                                        totalFinalPrice: totalFinalPrice,
                                        includeTotalRow: false,
                                        compact: true,
                                      ),
                                    ],
                                  )
                                : Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: _buildPrintPreviewTable(
                                          calculations: leftCalculations,
                                          selectedRod: selectedRod,
                                          totalQuantity: totalQuantity,
                                          totalOriginalPrice:
                                              totalOriginalPrice,
                                          totalFinalPrice: totalFinalPrice,
                                          includeTotalRow: false,
                                          compact: true,
                                          forceFitWidth: true,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _buildPrintPreviewTable(
                                          calculations: rightCalculations,
                                          selectedRod: selectedRod,
                                          totalQuantity: totalQuantity,
                                          totalOriginalPrice:
                                              totalOriginalPrice,
                                          totalFinalPrice: totalFinalPrice,
                                          includeTotalRow: false,
                                          compact: true,
                                          forceFitWidth: true,
                                        ),
                                      ),
                                    ],
                                  )
                          else
                            _buildPrintPreviewTable(
                              calculations: currentCalculations,
                              selectedRod: selectedRod,
                              totalQuantity: totalQuantity,
                              totalOriginalPrice: totalOriginalPrice,
                              totalFinalPrice: totalFinalPrice,
                              includeTotalRow: true,
                              compact: false,
                            ),
                          if (effectiveSplitLayout) ...[
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Wrap(
                                spacing: 24,
                                runSpacing: 8,
                                children: [
                                  const Text(
                                    '총계',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    '총 수량: $totalQuantity대',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    '총 평균거래가: ${_numberFormat.format(totalOriginalPrice.toInt())}원',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    '총 최종 매입가: ${_numberFormat.format(totalFinalPrice.toInt())}원',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.blue.shade700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    runSpacing: 8,
                    children: [
                      Text(
                        effectiveSplitLayout
                            ? '$_printPreviewSplitThreshold행 초과로 좌/우 분할 표시 중'
                            : '생성일시: ${_formatDateTime(generatedAt)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade700,
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () async {
                              try {
                                final pdf = await _generatePdf();
                                await Printing.layoutPdf(
                                  onLayout: (PdfPageFormat format) async =>
                                      pdf.save(),
                                );
                              } catch (e) {
                                if (dialogContext.mounted) {
                                  ScaffoldMessenger.of(
                                    dialogContext,
                                  ).showSnackBar(
                                    SnackBar(content: Text('인쇄 오류: $e')),
                                  );
                                }
                              }
                            },
                            icon: const Icon(Icons.print),
                            label: const Text('인쇄'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(dialogContext),
                            child: const Text('닫기'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
