import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/app_database.dart';
import '../../data/field_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class IssueNoteDetailScreen extends ConsumerStatefulWidget {
  const IssueNoteDetailScreen({super.key, required this.noteLocalId});

  final String noteLocalId;

  @override
  ConsumerState<IssueNoteDetailScreen> createState() => _IssueNoteDetailScreenState();
}

class _IssueNoteDetailScreenState extends ConsumerState<IssueNoteDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _canController = TextEditingController();
  final _quantityController = TextEditingController();
  late Future<IssueNoteView?> _noteFuture;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _canController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  void _reload() {
    _noteFuture = ref.read(fieldRepositoryProvider).getIssueNote(widget.noteLocalId);
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(issueNoteItemsProvider(widget.noteLocalId));

    return Scaffold(
      appBar: const KithulAppBar(title: 'Issue Note', subtitle: 'Can quantities', showBack: true),
      body: FutureBuilder<IssueNoteView?>(
        future: _noteFuture,
        builder: (context, snapshot) {
          final view = snapshot.data;
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (view == null) {
            return const EmptyState(
              icon: Icons.error_outline,
              title: 'Issue note not found',
              message: 'This note may have been removed locally.',
            );
          }

          final note = view.note;
          final canEdit = note.status == NoteStatus.active;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              _IssueHeader(view: view),
              const SizedBox(height: 12),
              _Toolbar(
                onTransportCost: () => _snack(context, 'Transport cost capture is ready for the next sync phase.'),
                onInfo: () => _snack(context, 'Offline note: ${note.issueNoteName} is saved on this device.'),
                onExport: () => _snack(context, 'Export will use the local note data when enabled.'),
              ),
              const SizedBox(height: 12),
              if (canEdit) _AddCanForm(formKey: _formKey, canController: _canController, quantityController: _quantityController, onAdd: _addCan),
              if (!canEdit)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(14),
                    child: Text('This completed note is read-only. Reopen it to add or remove cans.'),
                  ),
                ),
              const SizedBox(height: 12),
              items.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Text('Could not load cans: $error'),
                data: (rows) => _CanList(
                  items: rows,
                  canEdit: canEdit,
                  onDelete: (itemLocalId) async {
                    await ref.read(fieldRepositoryProvider).deleteIssueCan(itemLocalId, widget.noteLocalId);
                    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                    setState(_reload);
                  },
                ),
              ),
              const SizedBox(height: 16),
              if (note.status == NoteStatus.active)
                FilledButton.icon(
                  onPressed: () async {
                    await ref.read(fieldRepositoryProvider).submitIssueNote(widget.noteLocalId);
                    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                    setState(_reload);
                  },
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Submit issue note'),
                )
              else
                FilledButton.icon(
                  onPressed: () async {
                    await ref.read(fieldRepositoryProvider).reopenIssueNote(widget.noteLocalId);
                    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                    setState(_reload);
                  },
                  icon: const Icon(Icons.restart_alt),
                  label: const Text('Reopen issue note'),
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _addCan() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(fieldRepositoryProvider).addIssueCan(
          issueNoteLocalId: widget.noteLocalId,
          canCode: _canController.text,
          quantity: double.parse(_quantityController.text),
        );
    _canController.clear();
    _quantityController.clear();
    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
    setState(_reload);
  }

  void _snack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _IssueHeader extends StatelessWidget {
  const _IssueHeader({required this.view});

  final IssueNoteView view;

  @override
  Widget build(BuildContext context) {
    final note = view.note;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Text(note.issueNoteName, style: Theme.of(context).textTheme.titleLarge)),
                StatusBadge(label: note.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${note.type} - ${shortDateFormat.format(note.collectionDate)}',
              style: const TextStyle(color: kithulMuted),
            ),
            const SizedBox(height: 4),
            Text(view.center?.agent ?? 'No center agent', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: 'Can count', value: note.canCount.toString()),
                MetricChip(label: 'Total qty', value: quantityFormat.format(note.totalQty), color: kithulGreen),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({required this.onTransportCost, required this.onInfo, required this.onExport});

  final VoidCallback onTransportCost;
  final VoidCallback onInfo;
  final VoidCallback onExport;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        OutlinedButton.icon(onPressed: onTransportCost, icon: const Icon(Icons.receipt_long_outlined), label: const Text('Transport cost')),
        OutlinedButton.icon(onPressed: onInfo, icon: const Icon(Icons.info_outline), label: const Text('Info')),
        FilledButton.icon(
          style: FilledButton.styleFrom(backgroundColor: kithulGreen),
          onPressed: onExport,
          icon: const Icon(Icons.download_outlined),
          label: const Text('Export'),
        ),
      ],
    );
  }
}

class _AddCanForm extends StatelessWidget {
  const _AddCanForm({
    required this.formKey,
    required this.canController,
    required this.quantityController,
    required this.onAdd,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController canController;
  final TextEditingController quantityController;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add can', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              TextFormField(
                controller: canController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'Select / Type Can ID', prefixIcon: Icon(Icons.search)),
                validator: (value) => value == null || value.trim().isEmpty ? 'Enter can ID' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: quantityController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                decoration: const InputDecoration(labelText: 'Quantity'),
                validator: (value) {
                  final qty = double.tryParse(value ?? '');
                  if (qty == null) return 'Enter quantity';
                  if (qty <= 0) return 'Quantity must be more than 0';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              FilledButton.icon(onPressed: onAdd, icon: const Icon(Icons.add), label: const Text('Add')),
            ],
          ),
        ),
      ),
    );
  }
}

class _CanList extends StatelessWidget {
  const _CanList({required this.items, required this.canEdit, required this.onDelete});

  final List<IssueNoteItemRecord> items;
  final bool canEdit;
  final ValueChanged<String> onDelete;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Card(
        child: SizedBox(
          height: 220,
          child: EmptyState(
            icon: Icons.inventory_2_outlined,
            title: 'No cans recorded yet',
            message: 'Add at least one can to start tracking quantity.',
          ),
        ),
      );
    }

    return Column(
      children: [
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Card(
              child: ListTile(
                title: Text(item.canCode, style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text('Quantity ${quantityFormat.format(item.quantity)}'),
                trailing: canEdit
                    ? IconButton(
                        tooltip: 'Delete can',
                        onPressed: () => onDelete(item.localId),
                        icon: Icon(Icons.delete_outline, color: Colors.red.shade600),
                      )
                    : null,
              ),
            ),
          ),
      ],
    );
  }
}
