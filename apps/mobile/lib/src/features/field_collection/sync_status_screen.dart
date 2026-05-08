import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme.dart';
import '../../data/auth_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class SyncStatusScreen extends ConsumerStatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  ConsumerState<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends ConsumerState<SyncStatusScreen> {
  bool _syncing = false;
  String? _message;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).asData?.value;
    final pending = ref
        .watch(pendingSyncCountProvider)
        .maybeWhen(data: (value) => value, orElse: () => 0);
    final metadata = ref
        .watch(syncMetadataProvider)
        .maybeWhen(data: (value) => value, orElse: () => <String, String>{});
    final lastSync = metadata[AuthRepository.lastSyncAtKey];
    final lastError = metadata[AuthRepository.lastSyncErrorKey];

    return Scaffold(
      appBar: const KithulAppBar(
        title: 'Sync Status',
        subtitle: 'Local WiFi sync',
        showBack: true,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Connection',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  _InfoRow(
                    label: 'Server',
                    value: session?.serverUrl ?? 'Not logged in',
                  ),
                  _InfoRow(label: 'User', value: session?.displayName ?? '-'),
                  _InfoRow(label: 'Pending changes', value: pending.toString()),
                  _InfoRow(
                    label: 'Last sync',
                    value: _formatLastSync(lastSync),
                  ),
                  if (lastError != null && lastError.isNotEmpty)
                    _InfoRow(
                      label: 'Last error',
                      value: lastError,
                      danger: true,
                    ),
                  if (_message != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _message!,
                      style: TextStyle(
                        color: _message!.contains('completed')
                            ? kithulGreen
                            : Colors.red.shade700,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _syncing ? null : _syncNow,
            icon: _syncing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync),
            label: const Text('Sync now'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authRepositoryProvider).logout();
              ref.invalidate(sessionProvider);
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
          const SizedBox(height: 18),
          const Text(
            'Use the PC IPv4 address from ipconfig, for example http://192.168.1.5:4000. The phone and PC must be on the same WiFi network.',
            style: TextStyle(color: kithulMuted, height: 1.4),
          ),
        ],
      ),
    );
  }

  Future<void> _syncNow() async {
    setState(() {
      _syncing = true;
      _message = null;
    });
    final result = await ref.read(mobileSyncServiceProvider).syncNow();
    if (mounted) {
      setState(() {
        _syncing = false;
        _message = result.message;
      });
      ref.invalidate(pendingSyncCountProvider);
      ref.invalidate(syncMetadataProvider);
    }
  }

  String _formatLastSync(String? value) {
    if (value == null || value.isEmpty) return 'Never';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('MMM d, yyyy h:mm a').format(parsed);
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.danger = false,
  });

  final String label;
  final String value;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 118,
            child: Text(
              label,
              style: const TextStyle(
                color: kithulMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: danger ? Colors.red.shade700 : kithulInk,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
