import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _serverController = TextEditingController();
  final _userController = TextEditingController(text: 'field01');
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final savedUrl = await ref.read(authRepositoryProvider).getServerUrl();
      if (mounted && savedUrl != null) {
        _serverController.text = savedUrl;
      }
    });
  }

  @override
  void dispose() {
    _serverController.dispose();
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height - 44),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const KithulLogo(),
                  const SizedBox(height: 42),
                  Text('Field collector login', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 10),
                  const Text(
                    'Enter the PC server address and your Field Collection employee login. Offline work stays on this phone until sync succeeds.',
                    style: TextStyle(color: kithulMuted, height: 1.4),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _serverController,
                    keyboardType: TextInputType.url,
                    decoration: const InputDecoration(
                      labelText: 'Server URL',
                      hintText: 'http://192.168.1.5:4000',
                      prefixIcon: Icon(Icons.wifi_tethering_outlined),
                    ),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Enter the PC server URL' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _userController,
                    decoration: const InputDecoration(
                      labelText: 'User ID',
                      hintText: 'field01',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Enter user ID' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      hintText: 'password123',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    validator: (value) => value == null || value.isEmpty ? 'Enter password' : null,
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _loading ? null : _testConnection,
                          icon: const Icon(Icons.network_check),
                          label: const Text('Test'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _loading ? null : _login,
                          icon: _loading
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.login),
                          label: const Text('Login'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (_message != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _message!.startsWith('Connected') ? const Color(0xFFEFFDF5) : const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _message!,
                        style: TextStyle(
                          color: _message!.startsWith('Connected') ? kithulGreen : Colors.red.shade700,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  const SizedBox(height: 24),
                  const _RoleInfoCard(
                    icon: Icons.assignment_turned_in_outlined,
                    title: 'Field Collector',
                    subtitle: 'Issue notes, can quantities, transfer notes, and offline sync',
                  ),
                  const SizedBox(height: 12),
                  const _RoleInfoCard(
                    icon: Icons.agriculture_outlined,
                    title: 'Farmer',
                    subtitle: 'Reserved for the next mobile phase',
                    disabled: true,
                  ),
                  const SizedBox(height: 24),
                  const SyncStatusPill(),
                  const SizedBox(height: 12),
                  const Text('KithulFlow Mobile v1.0.0', style: TextStyle(color: kithulMuted, fontSize: 12)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _testConnection() async {
    if (_serverController.text.trim().isEmpty) {
      setState(() => _message = 'Enter the PC server URL first.');
      return;
    }

    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final result = await ref.read(mobileSyncServiceProvider).testConnection(_serverController.text);
      if (mounted) {
        setState(() {
          _loading = false;
          _message = result.message;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _message = 'Could not reach server: $error';
        });
      }
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      await ref.read(authRepositoryProvider).login(
            serverUrl: _serverController.text,
            userId: _userController.text,
            password: _passwordController.text,
          );
      ref.invalidate(sessionProvider);
      await ref.read(mobileSyncServiceProvider).syncNow();
      if (mounted) context.go('/field-collection');
    } on DioException catch (error) {
      final data = error.response?.data;
      final message = data is Map && data['message'] != null ? '${data['message']}' : 'Could not connect or login.';
      if (mounted) {
        setState(() {
          _loading = false;
          _message = message;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _message = error.toString();
        });
      }
    }
  }
}

class _RoleInfoCard extends StatelessWidget {
  const _RoleInfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.disabled = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: (disabled ? Colors.grey : kithulBlue).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: disabled ? Colors.grey : kithulBlue),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(color: kithulMuted)),
                ],
              ),
            ),
            Icon(disabled ? Icons.lock_outline : Icons.verified_user_outlined, color: disabled ? Colors.grey : kithulBlue),
          ],
        ),
      ),
    );
  }
}
