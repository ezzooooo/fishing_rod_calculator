import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/brand_provider.dart';
import '../widgets/app_drawer.dart';

class AddEditBrandScreen extends ConsumerStatefulWidget {
  final String? brandId;

  const AddEditBrandScreen({super.key, this.brandId});

  @override
  ConsumerState<AddEditBrandScreen> createState() => _AddEditBrandScreenState();
}

class _AddEditBrandScreenState extends ConsumerState<AddEditBrandScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  bool get isEditing => widget.brandId != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _loadBrandData();
    }
  }

  void _loadBrandData() {
    final brand = ref.read(brandByIdProvider(widget.brandId!));
    if (brand != null) {
      _nameController.text = brand.name;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMobileLayout = MediaQuery.sizeOf(context).width < 700;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? '브랜드 수정' : '브랜드 추가'),
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
            TextButton(onPressed: _saveBrand, child: const Text('저장')),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/brands'),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              16,
              16,
              16,
              16 + MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: isMobileLayout ? double.infinity : 720,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '브랜드 정보',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: '브랜드명',
                                hintText: '브랜드명을 입력하세요',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.business),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return '브랜드명을 입력해주세요';
                                }
                                return null;
                              },
                              enabled: !_isLoading,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _saveBrand,
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
                              isEditing ? '수정 완료' : '브랜드 추가',
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
      ),
    );
  }

  Future<void> _saveBrand() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final name = _nameController.text.trim();

      if (isEditing) {
        await ref
            .read(brandProvider.notifier)
            .updateBrand(widget.brandId!, name);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('브랜드가 수정되었습니다'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        await ref.read(brandProvider.notifier).addBrand(name);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('브랜드가 추가되었습니다'),
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
