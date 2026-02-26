import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await ref
          .read(authControllerProvider)
          .signIn(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
    } on FirebaseAuthException catch (e) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_toErrorMessage(e)),
          backgroundColor: Colors.red,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('로그인 실패: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  String _toErrorMessage(FirebaseAuthException exception) {
    switch (exception.code) {
      case 'invalid-email':
        return '이메일 형식이 올바르지 않습니다.';
      case 'invalid-credential':
      case 'user-not-found':
      case 'wrong-password':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'too-many-requests':
        return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.';
      default:
        return '로그인 오류: ${exception.message ?? exception.code}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            24,
            24,
            24,
            24 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.lock_outline, size: 56),
                        const SizedBox(height: 16),
                        Text(
                          '직원 로그인',
                          style: Theme.of(context).textTheme.headlineSmall,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '허용된 직원 계정만 접근할 수 있습니다.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _emailController,
                          enabled: !_isSubmitting,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: '이메일',
                            prefixIcon: Icon(Icons.mail_outline),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return '이메일을 입력해주세요.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _passwordController,
                          enabled: !_isSubmitting,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: '비밀번호',
                            prefixIcon: Icon(Icons.password_outlined),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return '비밀번호를 입력해주세요.';
                            }
                            return null;
                          },
                          onFieldSubmitted: (_) => _submit(),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _isSubmitting ? null : _submit,
                          child: _isSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('로그인'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
