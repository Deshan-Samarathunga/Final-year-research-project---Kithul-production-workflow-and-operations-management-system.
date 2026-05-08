import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../shared/kithul_widgets.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const KithulLogo(),
              const Spacer(),
              Text('Mobile collection', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              const Text(
                'Continue field work even without internet. Your notes sync when the backend sync service is connected.',
                style: TextStyle(color: kithulMuted, height: 1.4),
              ),
              const SizedBox(height: 26),
              _RoleCard(
                icon: Icons.assignment_turned_in_outlined,
                title: 'Field Collector',
                subtitle: 'Issue notes, can quantities, and transfer notes',
                onTap: () => context.go('/field-collection'),
              ),
              const SizedBox(height: 12),
              const _RoleCard(
                icon: Icons.agriculture_outlined,
                title: 'Farmer',
                subtitle: 'Reserved for the next mobile phase',
                disabled: true,
              ),
              const Spacer(),
              const SyncStatusPill(),
              const SizedBox(height: 12),
              const Text('KithulFlow Mobile v1.0.0', style: TextStyle(color: kithulMuted, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.disabled = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: disabled ? null : onTap,
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
              Icon(disabled ? Icons.lock_outline : Icons.arrow_forward_rounded, color: disabled ? Colors.grey : kithulBlue),
            ],
          ),
        ),
      ),
    );
  }
}
