import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/fishing_rod_provider.dart';
import '../providers/brand_provider.dart';
import '../widgets/app_drawer.dart';
import '../models/fishing_rod.dart';

class AddEditFishingRodScreen extends ConsumerStatefulWidget {
  final String? fishingRodId;

  const AddEditFishingRodScreen({super.key, this.fishingRodId});

  @override
  ConsumerState<AddEditFishingRodScreen> createState() =>
      _AddEditFishingRodScreenState();
}

class _AddEditFishingRodScreenState
    extends ConsumerState<AddEditFishingRodScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _minValueController = TextEditingController();
  final _maxValueController = TextEditingController();

  String? _selectedBrandId;
  bool _isLoading = false;

  // 숫자 포맷터 (3자리마다 콤마)
  final NumberFormat _numberFormat = NumberFormat('#,###');

  // 칸수 선택 관련
  Set<int> _selectedLengths = <int>{};
  final Map<int, TextEditingController> _priceControllers = {};
  final Map<int, FocusNode> _priceFocusNodes = {};

  // 칸수 설정 모드
  bool _isLengthSettingMode = false;

  bool get isEditing => widget.fishingRodId != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _loadFishingRodData();
    }
  }

  void _loadFishingRodData() {
    final rod = ref.read(fishingRodByIdProvider(widget.fishingRodId!));
    if (rod != null) {
      _nameController.text = rod.name;
      _minValueController.text = rod.minValue.toString();
      _maxValueController.text = rod.maxValue.toString();
      _selectedBrandId = rod.brandId;

      // 기존 낚시대의 칸수들을 선택된 상태로 설정
      _selectedLengths = rod.availableLengths.toSet();

      // 각 칸수에 대해 개별 가격으로 초기화 (없으면 기본 가격 사용)
      for (int length in _selectedLengths) {
        final price = rod.getPriceForLength(length);
        _priceControllers[length] = TextEditingController(
          text: price.toStringAsFixed(0),
        );
        _priceFocusNodes[length] = FocusNode();
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _minValueController.dispose();
    _maxValueController.dispose();

    // 가격 컨트롤러들과 포커스 노드들 정리
    for (var controller in _priceControllers.values) {
      controller.dispose();
    }
    for (var focusNode in _priceFocusNodes.values) {
      focusNode.dispose();
    }

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMobileLayout = MediaQuery.sizeOf(context).width < 900;
    final brands = ref.watch(brandProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? '낚시대 수정' : '낚시대 추가'),
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            TextButton(onPressed: _saveFishingRod, child: const Text('저장')),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/fishing-rods'),
      body: brands.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.warning, size: 80, color: Colors.orange),
                  SizedBox(height: 16),
                  Text(
                    '브랜드가 없습니다',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '먼저 브랜드를 추가해주세요',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            )
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: isMobileLayout ? double.infinity : 980,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 기본 정보 카드
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '기본 정보',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 16),
                                DropdownButtonFormField<String>(
                                  initialValue: _selectedBrandId,
                                  decoration: const InputDecoration(
                                    labelText: '브랜드',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.business),
                                  ),
                                  items: brands.map((brand) {
                                    return DropdownMenuItem(
                                      value: brand.id,
                                      child: Text(brand.name),
                                    );
                                  }).toList(),
                                  onChanged: _isLoading
                                      ? null
                                      : (value) {
                                          setState(() {
                                            _selectedBrandId = value;
                                            // 브랜드 변경 시에는 칸수 입력을 유지
                                          });
                                        },
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return '브랜드를 선택해주세요';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  controller: _nameController,
                                  decoration: const InputDecoration(
                                    labelText: '낚시대명',
                                    hintText: '낚시대명을 입력하세요',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.sports),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return '낚시대명을 입력해주세요';
                                    }
                                    return null;
                                  },
                                  enabled: !_isLoading,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // 칸수 선택 카드
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (isMobileLayout)
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '칸수 선택',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.bold,
                                            ),
                                      ),
                                      if (!_isLengthSettingMode) ...[
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 8,
                                          children: [
                                            TextButton.icon(
                                              onPressed: _isLoading
                                                  ? null
                                                  : _clearAllInputs,
                                              icon: const Icon(
                                                Icons.refresh,
                                                size: 16,
                                              ),
                                              label: const Text('초기화'),
                                              style: TextButton.styleFrom(
                                                foregroundColor: Colors.orange,
                                              ),
                                            ),
                                            TextButton.icon(
                                              onPressed: _isLoading
                                                  ? null
                                                  : () {
                                                      setState(() {
                                                        _isLengthSettingMode =
                                                            true;
                                                      });
                                                    },
                                              icon: const Icon(
                                                Icons.settings,
                                                size: 16,
                                              ),
                                              label: const Text('범위 설정'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  )
                                else
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '칸수 선택',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.bold,
                                            ),
                                      ),
                                      if (!_isLengthSettingMode)
                                        Row(
                                          children: [
                                            TextButton.icon(
                                              onPressed: _isLoading
                                                  ? null
                                                  : _clearAllInputs,
                                              icon: const Icon(
                                                Icons.refresh,
                                                size: 16,
                                              ),
                                              label: const Text('초기화'),
                                              style: TextButton.styleFrom(
                                                foregroundColor: Colors.orange,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            TextButton.icon(
                                              onPressed: _isLoading
                                                  ? null
                                                  : () {
                                                      setState(() {
                                                        _isLengthSettingMode =
                                                            true;
                                                      });
                                                    },
                                              icon: const Icon(
                                                Icons.settings,
                                                size: 16,
                                              ),
                                              label: const Text('범위 설정'),
                                            ),
                                          ],
                                        ),
                                    ],
                                  ),
                                const SizedBox(height: 16),

                                // 범위 설정 모드
                                if (_isLengthSettingMode) ...[
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: Colors.blue.shade200,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          '범위로 칸수 설정',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        if (isMobileLayout)
                                          Column(
                                            children: [
                                              TextFormField(
                                                controller: _minValueController,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: '최소값',
                                                      border:
                                                          OutlineInputBorder(),
                                                      suffixText: '칸',
                                                      isDense: true,
                                                    ),
                                                keyboardType:
                                                    TextInputType.number,
                                                inputFormatters: [
                                                  FilteringTextInputFormatter
                                                      .digitsOnly,
                                                ],
                                              ),
                                              const SizedBox(height: 8),
                                              TextFormField(
                                                controller: _maxValueController,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: '최대값',
                                                      border:
                                                          OutlineInputBorder(),
                                                      suffixText: '칸',
                                                      isDense: true,
                                                    ),
                                                keyboardType:
                                                    TextInputType.number,
                                                inputFormatters: [
                                                  FilteringTextInputFormatter
                                                      .digitsOnly,
                                                ],
                                              ),
                                            ],
                                          )
                                        else
                                          Row(
                                            children: [
                                              Expanded(
                                                child: TextFormField(
                                                  controller:
                                                      _minValueController,
                                                  decoration:
                                                      const InputDecoration(
                                                        labelText: '최소값',
                                                        border:
                                                            OutlineInputBorder(),
                                                        suffixText: '칸',
                                                        isDense: true,
                                                      ),
                                                  keyboardType:
                                                      TextInputType.number,
                                                  inputFormatters: [
                                                    FilteringTextInputFormatter
                                                        .digitsOnly,
                                                  ],
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: TextFormField(
                                                  controller:
                                                      _maxValueController,
                                                  decoration:
                                                      const InputDecoration(
                                                        labelText: '최대값',
                                                        border:
                                                            OutlineInputBorder(),
                                                        suffixText: '칸',
                                                        isDense: true,
                                                      ),
                                                  keyboardType:
                                                      TextInputType.number,
                                                  inputFormatters: [
                                                    FilteringTextInputFormatter
                                                        .digitsOnly,
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        const SizedBox(height: 12),
                                        if (isMobileLayout)
                                          Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.stretch,
                                            children: [
                                              ElevatedButton(
                                                onPressed: _applyLengthSettings,
                                                child: const Text('적용'),
                                              ),
                                              const SizedBox(height: 8),
                                              OutlinedButton(
                                                onPressed: () => setState(
                                                  () => _isLengthSettingMode =
                                                      false,
                                                ),
                                                child: const Text('취소'),
                                              ),
                                            ],
                                          )
                                        else
                                          Row(
                                            children: [
                                              Expanded(
                                                child: ElevatedButton(
                                                  onPressed:
                                                      _applyLengthSettings,
                                                  child: const Text('적용'),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: OutlinedButton(
                                                  onPressed: () => setState(
                                                    () => _isLengthSettingMode =
                                                        false,
                                                  ),
                                                  child: const Text('취소'),
                                                ),
                                              ),
                                            ],
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                ],

                                // 칸수 선택 칩들 (16~80)
                                Text(
                                  '사용 가능한 칸수 (탭하여 선택/해제)',
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: List.generate(65, (index) {
                                    final length =
                                        16 + (index); // 16, 18, 20, ..., 80
                                    final isSelected = _selectedLengths
                                        .contains(length);

                                    return FilterChip(
                                      label: Text('$length칸'),
                                      selected: isSelected,
                                      onSelected: _isLoading
                                          ? null
                                          : (selected) {
                                              _toggleLengthSelection(length);
                                            },
                                      backgroundColor: Colors.grey.shade100,
                                      selectedColor: Colors.blue.shade100,
                                      checkmarkColor: Colors.blue.shade700,
                                    );
                                  }),
                                ),

                                if (_selectedLengths.isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: Colors.green.shade200,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '선택된 칸수: ${_selectedLengths.length}개',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 4,
                                          runSpacing: 4,
                                          children:
                                              (_selectedLengths.toList()
                                                    ..sort())
                                                  .map((length) {
                                                    return Chip(
                                                      label: Text('$length칸'),
                                                      backgroundColor:
                                                          Colors.green.shade100,
                                                      deleteIcon: const Icon(
                                                        Icons.close,
                                                        size: 16,
                                                      ),
                                                      onDeleted: () =>
                                                          _toggleLengthSelection(
                                                            length,
                                                          ),
                                                    );
                                                  })
                                                  .toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // 가격 정보 카드
                        if (_selectedLengths.isNotEmpty)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '가격 정보 (칸수별)',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    isMobileLayout
                                        ? '각 칸수별로 중고가를 입력하세요.'
                                        : '각 칸수별로 중고가를 입력하세요. Tab 키로 다음 필드로 이동할 수 있습니다.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                  const SizedBox(height: 16),

                                  // 칸수별 가격 입력 리스트
                                  ...(_selectedLengths.toList()..sort()).map((
                                    length,
                                  ) {
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 12.0,
                                      ),
                                      child: isMobileLayout
                                          ? Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        vertical: 8,
                                                        horizontal: 12,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: Colors.blue.shade50,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    border: Border.all(
                                                      color:
                                                          Colors.blue.shade200,
                                                    ),
                                                  ),
                                                  child: Text(
                                                    '$length칸',
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 14,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(height: 8),
                                                TextFormField(
                                                  controller:
                                                      _priceControllers[length],
                                                  focusNode:
                                                      _priceFocusNodes[length],
                                                  decoration: InputDecoration(
                                                    labelText: '중고가',
                                                    hintText: '가격 입력',
                                                    border:
                                                        const OutlineInputBorder(),
                                                    prefixIcon: const Icon(
                                                      Icons.attach_money,
                                                      size: 20,
                                                    ),
                                                    suffixText: '원',
                                                    isDense: true,
                                                    errorStyle: const TextStyle(
                                                      fontSize: 11,
                                                    ),
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
                                                      _focusNextPriceField(
                                                        length,
                                                      ),
                                                  validator: (value) {
                                                    if (value == null ||
                                                        value.isEmpty) {
                                                      return '가격을 입력해주세요';
                                                    }
                                                    final doubleValue =
                                                        double.tryParse(value);
                                                    if (doubleValue == null ||
                                                        doubleValue < 0) {
                                                      return '유효한 가격을 입력해주세요';
                                                    }
                                                    return null;
                                                  },
                                                  enabled: !_isLoading,
                                                ),
                                              ],
                                            )
                                          : Row(
                                              children: [
                                                // 칸수 라벨
                                                Container(
                                                  width: 80,
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        vertical: 12,
                                                        horizontal: 16,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: Colors.blue.shade50,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    border: Border.all(
                                                      color:
                                                          Colors.blue.shade200,
                                                    ),
                                                  ),
                                                  child: Text(
                                                    '$length칸',
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 14,
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                ),
                                                const SizedBox(width: 12),

                                                // 가격 입력 필드
                                                Expanded(
                                                  child: TextFormField(
                                                    controller:
                                                        _priceControllers[length],
                                                    focusNode:
                                                        _priceFocusNodes[length],
                                                    decoration: InputDecoration(
                                                      labelText: '중고가',
                                                      hintText: '가격 입력',
                                                      border:
                                                          const OutlineInputBorder(),
                                                      prefixIcon: const Icon(
                                                        Icons.attach_money,
                                                        size: 20,
                                                      ),
                                                      suffixText: '원',
                                                      isDense: true,
                                                      errorStyle:
                                                          const TextStyle(
                                                            fontSize: 11,
                                                          ),
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
                                                        _focusNextPriceField(
                                                          length,
                                                        ),
                                                    validator: (value) {
                                                      if (value == null ||
                                                          value.isEmpty) {
                                                        return '가격을 입력해주세요';
                                                      }
                                                      final doubleValue =
                                                          double.tryParse(
                                                            value,
                                                          );
                                                      if (doubleValue == null ||
                                                          doubleValue < 0) {
                                                        return '유효한 가격을 입력해주세요';
                                                      }
                                                      return null;
                                                    },
                                                    enabled: !_isLoading,
                                                  ),
                                                ),
                                              ],
                                            ),
                                    );
                                  }),

                                  // 일괄 가격 설정 기능
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: Colors.orange.shade200,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          '일괄 가격 설정',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        if (isMobileLayout)
                                          Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.stretch,
                                            children: [
                                              TextFormField(
                                                key: const ValueKey(
                                                  'bulk_price',
                                                ),
                                                decoration:
                                                    const InputDecoration(
                                                      labelText:
                                                          '모든 칸수에 적용할 가격',
                                                      border:
                                                          OutlineInputBorder(),
                                                      suffixText: '원',
                                                      isDense: true,
                                                    ),
                                                keyboardType:
                                                    TextInputType.number,
                                                inputFormatters: [
                                                  FilteringTextInputFormatter
                                                      .digitsOnly,
                                                ],
                                                onFieldSubmitted: (value) =>
                                                    _applyBulkPrice(value),
                                              ),
                                              const SizedBox(height: 8),
                                              ElevatedButton(
                                                onPressed: _showBulkPriceDialog,
                                                child: const Text('적용'),
                                              ),
                                            ],
                                          )
                                        else
                                          Row(
                                            children: [
                                              Expanded(
                                                child: TextFormField(
                                                  key: const ValueKey(
                                                    'bulk_price',
                                                  ),
                                                  decoration:
                                                      const InputDecoration(
                                                        labelText:
                                                            '모든 칸수에 적용할 가격',
                                                        border:
                                                            OutlineInputBorder(),
                                                        suffixText: '원',
                                                        isDense: true,
                                                      ),
                                                  keyboardType:
                                                      TextInputType.number,
                                                  inputFormatters: [
                                                    FilteringTextInputFormatter
                                                        .digitsOnly,
                                                  ],
                                                  onFieldSubmitted: (value) =>
                                                      _applyBulkPrice(value),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              ElevatedButton(
                                                onPressed: _showBulkPriceDialog,
                                                child: const Text('적용'),
                                              ),
                                            ],
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 24),

                        ElevatedButton(
                          onPressed: _isLoading ? null : _saveFishingRod,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Text(
                                  isEditing ? '수정 완료' : '낚시대 추가',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  void _clearAllInputs() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('초기화 확인'),
        content: const Text('칸수 선택과 가격 입력을 모두 초기화하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                // 선택된 칸수들을 모두 해제
                for (int length in _selectedLengths) {
                  _priceControllers[length]?.dispose();
                  _priceFocusNodes[length]?.dispose();
                }
                _priceControllers.clear();
                _priceFocusNodes.clear();
                _selectedLengths.clear();

                // 범위 설정 값도 초기화
                _minValueController.clear();
                _maxValueController.clear();
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('모든 입력이 초기화되었습니다'),
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

  void _applyLengthSettings() {
    final minValue = int.tryParse(_minValueController.text);
    final maxValue = int.tryParse(_maxValueController.text);

    if (minValue == null || maxValue == null || minValue >= maxValue) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('올바른 최소값과 최대값을 입력해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // 기존 선택된 칸수들을 모두 해제
    Set<int> newSelectedLengths = <int>{};

    // 범위에 맞는 칸수들을 자동 선택
    for (int i = minValue; i <= maxValue; i += 2) {
      newSelectedLengths.add(i);
    }

    // 새로 추가된 칸수들에 대해 컨트롤러와 포커스 노드 생성
    for (int length in newSelectedLengths) {
      if (!_priceControllers.containsKey(length)) {
        _priceControllers[length] = TextEditingController();
        _priceFocusNodes[length] = FocusNode();
      }
    }

    // 제거된 칸수들의 컨트롤러와 포커스 노드 정리
    for (int length in _selectedLengths.difference(newSelectedLengths)) {
      _priceControllers[length]?.dispose();
      _priceFocusNodes[length]?.dispose();
      _priceControllers.remove(length);
      _priceFocusNodes.remove(length);
    }

    setState(() {
      _selectedLengths = newSelectedLengths;
      _isLengthSettingMode = false;
    });
  }

  void _toggleLengthSelection(int length) {
    setState(() {
      if (_selectedLengths.contains(length)) {
        _selectedLengths.remove(length);
        _priceControllers[length]?.dispose();
        _priceFocusNodes[length]?.dispose();
        _priceControllers.remove(length);
        _priceFocusNodes.remove(length);
      } else {
        _selectedLengths.add(length);
        _priceControllers[length] = TextEditingController();
        _priceFocusNodes[length] = FocusNode();
      }
    });
  }

  void _focusNextPriceField(int currentLength) {
    final sortedLengths = _selectedLengths.toList()..sort();
    final currentIndex = sortedLengths.indexOf(currentLength);

    if (currentIndex < sortedLengths.length - 1) {
      final nextLength = sortedLengths[currentIndex + 1];
      _priceFocusNodes[nextLength]?.requestFocus();
    } else {
      // 마지막 필드에서는 포커스 해제
      FocusScope.of(context).unfocus();
    }
  }

  void _applyBulkPrice(String priceText) {
    if (priceText.isNotEmpty) {
      final price = double.tryParse(priceText);
      if (price != null && price >= 0) {
        setState(() {
          for (var controller in _priceControllers.values) {
            controller.text = priceText;
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '모든 칸수에 ${_numberFormat.format(price.toInt())}원이 적용되었습니다',
            ),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('올바른 가격을 입력해주세요'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showBulkPriceDialog() {
    final bulkPriceController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('일괄 가격 설정'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '선택된 ${_selectedLengths.length}개 칸수에 모두 같은 가격을 적용합니다.',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: bulkPriceController,
              decoration: const InputDecoration(
                labelText: '적용할 가격',
                border: OutlineInputBorder(),
                suffixText: '원',
              ),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              _applyBulkPrice(bulkPriceController.text);
              Navigator.pop(context);
            },
            child: const Text('적용'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveFishingRod() async {
    // 기본 정보 유효성 검사
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // 선택된 칸수가 있는지 확인
    if (_selectedLengths.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('최소 하나 이상의 칸수를 선택해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // 모든 선택된 칸수에 대해 가격이 입력되었는지 확인
    for (int length in _selectedLengths) {
      final priceText = _priceControllers[length]?.text ?? '';
      if (priceText.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$length칸의 가격을 입력해주세요'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
      final price = double.tryParse(priceText);
      if (price == null || price < 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$length칸의 가격이 올바르지 않습니다'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final name = _nameController.text.trim();
      final brandId = _selectedBrandId!;

      // 범위 설정 (선택된 칸수가 있으면 그것을 기준으로, 없으면 기본값)
      final sortedLengths = _selectedLengths.toList()..sort();
      final minValue = sortedLengths.isNotEmpty ? sortedLengths.first : 18;
      final maxValue = sortedLengths.isNotEmpty ? sortedLengths.last : 60;

      // 칸수별 가격 맵 생성
      final lengthPrices = <int, double>{};
      for (int length in _selectedLengths) {
        final priceText = _priceControllers[length]?.text ?? '';
        lengthPrices[length] = double.parse(priceText);
      }

      // 하위 호환성을 위한 평균 가격 계산
      final averagePrice = lengthPrices.values.isNotEmpty
          ? lengthPrices.values.reduce((a, b) => a + b) /
                lengthPrices.values.length
          : 0.0;

      if (isEditing) {
        await ref
            .read(fishingRodProvider.notifier)
            .updateFishingRod(
              id: widget.fishingRodId!,
              name: name,
              brandId: brandId,
              minValue: minValue,
              maxValue: maxValue,
              usedPrice: averagePrice,
              lengthPrices: lengthPrices,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('낚시대가 수정되었습니다'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        await ref
            .read(fishingRodProvider.notifier)
            .addFishingRod(
              name: name,
              brandId: brandId,
              minValue: minValue,
              maxValue: maxValue,
              usedPrice: averagePrice,
              lengthPrices: lengthPrices,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('낚시대가 추가되었습니다'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }

      if (mounted) {
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('오류가 발생했습니다: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}
