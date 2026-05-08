import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';

final shortDateFormat = DateFormat('MMM d, yyyy');
final quantityFormat = NumberFormat('#,##0.##');

class KithulLogo extends StatelessWidget {
  const KithulLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: kithulBlue,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        RichText(
          text: const TextSpan(
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 0),
            children: [
              TextSpan(text: 'Kithul', style: TextStyle(color: kithulBlue)),
              TextSpan(text: 'Flow', style: TextStyle(color: kithulOrange)),
            ],
          ),
        ),
      ],
    );
  }
}

class KithulAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const KithulAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.showBack = false,
  });

  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final bool showBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppBar(
      automaticallyImplyLeading: showBack,
      titleSpacing: showBack ? 0 : 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          if (subtitle != null)
            Text(
              subtitle!,
              style: const TextStyle(color: kithulMuted, fontSize: 12, fontWeight: FontWeight.w600),
            ),
        ],
      ),
      actions: [
        const Padding(
          padding: EdgeInsets.only(right: 8),
          child: SyncStatusPill(),
        ),
        ...?actions,
      ],
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: Color(0xFFE2E8F0)),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(64);
}

class SyncStatusPill extends ConsumerWidget {
  const SyncStatusPill({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(pendingSyncCountProvider).maybeWhen(
          data: (value) => value,
          orElse: () => 0,
        );
    final hasPending = pending > 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: hasPending ? const Color(0xFFFFF7ED) : const Color(0xFFEFFDF5),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: hasPending ? const Color(0xFFFED7AA) : const Color(0xFFBBF7D0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            hasPending ? Icons.cloud_upload_outlined : Icons.offline_pin_rounded,
            size: 16,
            color: hasPending ? const Color(0xFFC2410C) : kithulGreen,
          ),
          const SizedBox(width: 6),
          Text(
            hasPending ? '$pending sync' : 'Offline ready',
            style: TextStyle(
              color: hasPending ? const Color(0xFFC2410C) : kithulGreen,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: kithulBlue, size: 42),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message, style: const TextStyle(color: kithulMuted), textAlign: TextAlign.center),
            if (action != null) ...[
              const SizedBox(height: 18),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

class MetricChip extends StatelessWidget {
  const MetricChip({
    super.key,
    required this.label,
    required this.value,
    this.color = kithulBlue,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final color = label == 'Completed' ? kithulGreen : kithulBlue;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800)),
    );
  }
}

class FormSheet extends StatelessWidget {
  const FormSheet({super.key, required this.title, required this.subtitle, required this.child});

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              Text(subtitle, style: const TextStyle(color: kithulMuted)),
              const SizedBox(height: 18),
              child,
            ],
          ),
        ),
      ),
    );
  }
}
