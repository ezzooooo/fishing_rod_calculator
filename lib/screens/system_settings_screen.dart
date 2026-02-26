import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/brand.dart';
import '../models/fishing_rod.dart';
import '../providers/brand_provider.dart';
import '../providers/fishing_rod_provider.dart';
import '../widgets/app_drawer.dart';

class SystemSettingsScreen extends ConsumerStatefulWidget {
  const SystemSettingsScreen({super.key});

  @override
  ConsumerState<SystemSettingsScreen> createState() =>
      _SystemSettingsScreenState();
}

class _SystemSettingsScreenState extends ConsumerState<SystemSettingsScreen> {
  bool _isLoading = false;
  final _uuid = const Uuid();

  DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  Future<String> _readPickedFileAsString(PlatformFile file) async {
    if (file.bytes != null) {
      return utf8.decode(file.bytes!);
    }
    return file.xFile.readAsString();
  }

  Future<void> _saveJsonFile({
    required String dialogTitle,
    required String fileName,
    required String jsonString,
    required void Function() onSuccess,
  }) async {
    final bytes = Uint8List.fromList(utf8.encode(jsonString));
    final outputPath = await FilePicker.platform.saveFile(
      dialogTitle: dialogTitle,
      fileName: fileName,
      type: FileType.custom,
      allowedExtensions: const ['json'],
      bytes: bytes,
    );

    // 웹은 브라우저가 다운로드를 처리해서 항상 null을 반환합니다.
    if (kIsWeb || outputPath != null) {
      onSuccess();
    }
  }

  Brand _brandFromJsonMap(Map<String, dynamic> item) {
    final idCandidate = item['id']?.toString().trim() ?? '';
    final id = idCandidate.isEmpty ? _uuid.v4() : idCandidate;

    return Brand(
      id: id,
      name: item['name']?.toString() ?? '',
      createdAt: _parseDate(item['createdAt']),
      updatedAt: _parseDate(item['updatedAt']),
    );
  }

  FishingRod _fishingRodFromJsonMap(Map<String, dynamic> item) {
    final idCandidate = item['id']?.toString().trim() ?? '';
    final id = idCandidate.isEmpty ? _uuid.v4() : idCandidate;

    final lengthPrices = <int, double>{};
    final rawLengthPrices = item['lengthPrices'];
    if (rawLengthPrices is Map) {
      for (final entry in rawLengthPrices.entries) {
        final length = int.tryParse(entry.key.toString());
        final price = (entry.value as num?)?.toDouble();
        if (length != null && price != null) {
          lengthPrices[length] = price;
        }
      }
    }

    return FishingRod(
      id: id,
      name: item['name']?.toString() ?? '',
      brandId: item['brandId']?.toString() ?? '',
      minValue: (item['minValue'] as num?)?.toInt() ?? 18,
      maxValue: (item['maxValue'] as num?)?.toInt() ?? 60,
      usedPrice: (item['usedPrice'] as num?)?.toDouble() ?? 0.0,
      lengthPrices: lengthPrices,
      createdAt: _parseDate(item['createdAt']),
      updatedAt: _parseDate(item['updatedAt']),
    );
  }

  Future<void> _loadDefaultFishingRods() async {
    setState(() => _isLoading = true);

    try {
      final String jsonString = await rootBundle.loadString(
        'assets/fishing_rods.json',
      );
      final List<dynamic> jsonData = json.decode(jsonString);
      final rodNotifier = ref.read(fishingRodProvider.notifier);
      final rods = jsonData
          .map(
            (item) => _fishingRodFromJsonMap(Map<String, dynamic>.from(item)),
          )
          .toList();
      await rodNotifier.replaceFishingRods(rods);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('기본 낚시대 ${jsonData.length}개를 불러왔습니다.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('기본 낚시대 불러오기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadDefaultBrands() async {
    setState(() => _isLoading = true);

    try {
      final String jsonString = await rootBundle.loadString(
        'assets/brands.json',
      );
      final List<dynamic> jsonData = json.decode(jsonString);
      final brandNotifier = ref.read(brandProvider.notifier);
      final brands = jsonData
          .map((item) => _brandFromJsonMap(Map<String, dynamic>.from(item)))
          .toList();
      await brandNotifier.replaceBrands(brands);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('기본 브랜드 ${jsonData.length}개를 불러왔습니다.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('브랜드 불러오기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _exportBrands() async {
    setState(() => _isLoading = true);

    try {
      final brands = ref.read(brandProvider);

      if (brands.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('내보낼 브랜드가 없습니다.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // 브랜드 데이터를 JSON으로 변환
      final List<Map<String, dynamic>> brandData = brands
          .map(
            (brand) => {
              'id': brand.id,
              'name': brand.name,
              'createdAt': brand.createdAt?.toIso8601String(),
              'updatedAt': brand.updatedAt?.toIso8601String(),
            },
          )
          .toList();

      final String jsonString = const JsonEncoder.withIndent(
        '  ',
      ).convert(brandData);

      await _saveJsonFile(
        dialogTitle: '브랜드 데이터 저장',
        fileName: 'brands_${DateTime.now().millisecondsSinceEpoch}.json',
        jsonString: jsonString,
        onSuccess: () {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('브랜드 ${brands.length}개를 저장했습니다.'),
                backgroundColor: Colors.green,
              ),
            );
          }
        },
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('브랜드 내보내기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _importBrands() async {
    setState(() => _isLoading = true);

    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['json'],
        dialogTitle: '브랜드 데이터 불러오기',
        withData: true,
      );

      if (result != null) {
        final String jsonString = await _readPickedFileAsString(
          result.files.single,
        );
        final List<dynamic> jsonData = json.decode(jsonString);
        final brandNotifier = ref.read(brandProvider.notifier);
        final brands = jsonData
            .map((item) => _brandFromJsonMap(Map<String, dynamic>.from(item)))
            .toList();
        await brandNotifier.replaceBrands(brands);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('브랜드 ${jsonData.length}개를 불러왔습니다.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('브랜드 불러오기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _exportFishingRods() async {
    setState(() => _isLoading = true);

    try {
      final fishingRods = ref.read(fishingRodProvider);

      if (fishingRods.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('내보낼 낚시대가 없습니다.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // 낚시대 데이터를 JSON으로 변환
      final List<Map<String, dynamic>> rodData = fishingRods
          .map(
            (rod) => {
              'id': rod.id,
              'name': rod.name,
              'brandId': rod.brandId,
              'minValue': rod.minValue,
              'maxValue': rod.maxValue,
              'usedPrice': rod.usedPrice,
              'lengthPrices': Map<String, dynamic>.from(
                rod.lengthPrices.map(
                  (key, value) => MapEntry(key.toString(), value),
                ),
              ),
              'createdAt': rod.createdAt?.toIso8601String(),
              'updatedAt': rod.updatedAt?.toIso8601String(),
            },
          )
          .toList();

      final String jsonString = const JsonEncoder.withIndent(
        '  ',
      ).convert(rodData);

      await _saveJsonFile(
        dialogTitle: '낚시대 데이터 저장',
        fileName: 'fishing_rods_${DateTime.now().millisecondsSinceEpoch}.json',
        jsonString: jsonString,
        onSuccess: () {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('낚시대 ${fishingRods.length}개를 저장했습니다.'),
                backgroundColor: Colors.green,
              ),
            );
          }
        },
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('낚시대 내보내기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _importFishingRods() async {
    setState(() => _isLoading = true);

    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['json'],
        dialogTitle: '낚시대 데이터 불러오기',
        withData: true,
      );

      if (result != null) {
        final String jsonString = await _readPickedFileAsString(
          result.files.single,
        );
        final List<dynamic> jsonData = json.decode(jsonString);
        final rodNotifier = ref.read(fishingRodProvider.notifier);
        final rods = jsonData
            .map(
              (item) => _fishingRodFromJsonMap(Map<String, dynamic>.from(item)),
            )
            .toList();
        await rodNotifier.replaceFishingRods(rods);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('낚시대 ${jsonData.length}개를 불러왔습니다.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('낚시대 불러오기 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brands = ref.watch(brandProvider);
    final fishingRods = ref.watch(fishingRodProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('시스템 설정'),
        backgroundColor: Colors.blue.shade100,
      ),
      drawer: const AppDrawer(currentRoute: '/system-settings'),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 브랜드 관리 섹션
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.business, color: Colors.blue),
                              const SizedBox(width: 8),
                              Text(
                                '브랜드 관리',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '현재 브랜드: ${brands.length}개',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              ElevatedButton.icon(
                                onPressed: _loadDefaultBrands,
                                icon: const Icon(Icons.download),
                                label: const Text('기본 브랜드 불러오기'),
                              ),
                              ElevatedButton.icon(
                                onPressed: _exportBrands,
                                icon: const Icon(Icons.upload),
                                label: const Text('브랜드 내보내기'),
                              ),
                              ElevatedButton.icon(
                                onPressed: _importBrands,
                                icon: const Icon(Icons.folder_open),
                                label: const Text('브랜드 불러오기'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 낚시대 관리 섹션
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.sports, color: Colors.green),
                              const SizedBox(width: 8),
                              Text(
                                '낚시대 관리',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '현재 낚시대: ${fishingRods.length}개',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              ElevatedButton.icon(
                                onPressed: _loadDefaultFishingRods,
                                icon: const Icon(Icons.download),
                                label: const Text('기본 낚시대 불러오기'),
                              ),
                              ElevatedButton.icon(
                                onPressed: _exportFishingRods,
                                icon: const Icon(Icons.upload),
                                label: const Text('낚시대 내보내기'),
                              ),
                              ElevatedButton.icon(
                                onPressed: _importFishingRods,
                                icon: const Icon(Icons.folder_open),
                                label: const Text('낚시대 불러오기'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 주의사항
                  Card(
                    color: Colors.orange.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.warning,
                                color: Colors.orange.shade700,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '주의사항',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.orange.shade700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            '• 데이터를 불러올 때 기존 데이터는 모두 삭제됩니다.\n'
                            '• 중요한 데이터는 미리 내보내기를 통해 백업하세요.\n'
                            '• JSON 파일 형식만 지원됩니다.',
                            style: TextStyle(fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
