import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/app_database.dart';
import '../../data/field_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class TransferNoteDetailScreen extends ConsumerStatefulWidget {
  const TransferNoteDetailScreen({super.key, required this.transferLocalId});

  final String transferLocalId;

  @override
  ConsumerState<TransferNoteDetailScreen> createState() => _TransferNoteDetailScreenState();
}

class _TransferNoteDetailScreenState extends ConsumerState<TransferNoteDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _canController = TextEditingController();
  late Future<TransferNoteView?> _noteFuture;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _canController.dispose();
    super.dispose();
  }

  void _reload() {
    _noteFuture = ref.read(fieldRepositoryProvider).getTransferNote(widget.transferLocalId);
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(transferNoteItemsProvider(widget.transferLocalId));

    return Scaffold(
      appBar: const KithulAppBar(title: 'Transfer Note', subtitle: 'Empty can transfer', showBack: true),
      body: FutureBuilder<TransferNoteView?>(
        future: _noteFuture,
        builder: (context, snapshot) {
          final view = snapshot.data;
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (view == null) {
            return const EmptyState(
              icon: Icons.error_outline,
              title: 'Transfer note not found',
              message: 'This note may have been removed locally.',
            );
          }

          final note = view.note;
          final canEdit = note.status == NoteStatus.active;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              _TransferHeader(view: view),
              const SizedBox(height: 12),
              if (canEdit)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Add empty can', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _canController,
                            textCapitalization: TextCapitalization.characters,
                            decoration: const InputDecoration(labelText: 'Select / Type Can ID', prefixIcon: Icon(Icons.search)),
                            validator: (value) => value == null || value.trim().isEmpty ? 'Enter can ID' : null,
                          ),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: () async {
                              if (!_formKey.currentState!.validate()) return;
                              await ref.read(fieldRepositoryProvider).addTransferCan(
                                    transferLocalId: widget.transferLocalId,
                                    canCode: _canController.text,
                                  );
                              _canController.clear();
                              setState(_reload);
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('Add can'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              items.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Text('Could not load cans: $error'),
                data: (rows) => _TransferCanList(
                  items: rows,
                  canEdit: canEdit,
                  onDelete: (itemLocalId) async {
                    await ref.read(fieldRepositoryProvider).deleteTransferCan(itemLocalId, widget.transferLocalId);
                    setState(_reload);
                  },
                ),
              ),
              const SizedBox(height: 16),
              if (canEdit)
                FilledButton.icon(
                  onPressed: () async {
                    await ref.read(fieldRepositoryProvider).completeTransferNote(widget.transferLocalId);
                    setState(_reload);
                  },
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Complete transfer note'),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _TransferHeader extends StatelessWidget {
  const _TransferHeader({required this.view});

  final TransferNoteView view;

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
                Expanded(child: Text(note.transferNoteNo, style: Theme.of(context).textTheme.titleLarge)),
                StatusBadge(label: note.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(shortDateFormat.format(note.transferDate), style: const TextStyle(color: kithulMuted)),
            const SizedBox(height: 4),
            Text(view.center?.agent ?? 'No center agent', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            MetricChip(label: 'Can count', value: note.canCount.toString()),
          ],
        ),
      ),
    );
  }
}

class _TransferCanList extends StatelessWidget {
  const _TransferCanList({required this.items, required this.canEdit, required this.onDelete});

  final List<TransferNoteItemRecord> items;
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
            message: 'Add empty cans before completing the transfer note.',
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
                subtitle: Text(canEdit ? 'Waiting to sync' : 'Completed'),
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
