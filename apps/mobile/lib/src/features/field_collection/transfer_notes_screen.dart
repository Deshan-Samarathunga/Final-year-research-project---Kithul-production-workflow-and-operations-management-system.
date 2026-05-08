import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_database.dart';
import '../../data/field_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class TransferNotesScreen extends ConsumerStatefulWidget {
  const TransferNotesScreen({super.key});

  @override
  ConsumerState<TransferNotesScreen> createState() => _TransferNotesScreenState();
}

class _TransferNotesScreenState extends ConsumerState<TransferNotesScreen> {
  String _status = NoteStatus.active;

  @override
  Widget build(BuildContext context) {
    final seed = ref.watch(seedDataProvider);
    final activeCount = ref.watch(transferNotesProvider(NoteStatus.active)).maybeWhen(
          data: (items) => items.length,
          orElse: () => 0,
        );
    final completedCount = ref.watch(transferNotesProvider(NoteStatus.completed)).maybeWhen(
          data: (items) => items.length,
          orElse: () => 0,
        );

    return Scaffold(
      appBar: const KithulAppBar(title: 'Transfer Notes', subtitle: 'Move empty cans', showBack: true),
      body: seed.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Could not load offline data: $error')),
        data: (_) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                children: [
                  SegmentedButton<String>(
                    segments: [
                      ButtonSegment(value: NoteStatus.active, label: Text('Active  $activeCount')),
                      ButtonSegment(value: NoteStatus.completed, label: Text('Completed  $completedCount')),
                    ],
                    selected: {_status},
                    onSelectionChanged: (value) => setState(() => _status = value.first),
                    showSelectedIcon: false,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back),
                          label: const Text('Issue notes'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => _showTransferSheet(context, ref),
                          icon: const Icon(Icons.add),
                          label: const Text('New transfer'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(child: _TransferList(status: _status)),
          ],
        ),
      ),
    );
  }
}

class _TransferList extends ConsumerWidget {
  const _TransferList({required this.status});

  final String status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(transferNotesProvider(status));
    return notes.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Could not load transfer notes: $error')),
      data: (items) {
        if (items.isEmpty) {
          return EmptyState(
            icon: Icons.local_shipping_outlined,
            title: status == NoteStatus.active ? 'No active transfer notes yet' : 'No completed transfer notes yet',
            message: status == NoteStatus.active
                ? 'Create a transfer note to move empty cans to a collection center.'
                : 'Completed transfer notes will appear here.',
            action: status == NoteStatus.active
                ? FilledButton.icon(
                    onPressed: () => _showTransferSheet(context, ref),
                    icon: const Icon(Icons.add),
                    label: const Text('New Transfer Note'),
                  )
                : null,
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) => _TransferCard(view: items[index]),
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemCount: items.length,
        );
      },
    );
  }
}

class _TransferCard extends ConsumerWidget {
  const _TransferCard({required this.view});

  final TransferNoteView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final note = view.note;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(note.transferNoteNo, style: Theme.of(context).textTheme.titleMedium)),
                StatusBadge(label: note.status),
              ],
            ),
            const SizedBox(height: 8),
            Text('${shortDateFormat.format(note.transferDate)} - ${view.center?.agent ?? 'No agent'}', style: const TextStyle(color: kithulMuted)),
            const SizedBox(height: 12),
            MetricChip(label: 'Can count', value: note.canCount.toString()),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/field-collection/transfers/${note.localId}'),
                    icon: const Icon(Icons.arrow_forward),
                    label: Text(note.status == NoteStatus.active ? 'Continue' : 'View'),
                  ),
                ),
                if (note.status == NoteStatus.active) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () async {
                        await ref.read(fieldRepositoryProvider).completeTransferNote(note.localId);
                        unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                      },
                      icon: const Icon(Icons.check_circle_outline),
                      label: const Text('Complete'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _showTransferSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const FormSheet(
      title: 'Create transfer note',
      subtitle: 'Select a center and date for the transfer note.',
      child: _CreateTransferNoteForm(),
    ),
  );
}

class _CreateTransferNoteForm extends ConsumerStatefulWidget {
  const _CreateTransferNoteForm();

  @override
  ConsumerState<_CreateTransferNoteForm> createState() => _CreateTransferNoteFormState();
}

class _CreateTransferNoteFormState extends ConsumerState<_CreateTransferNoteForm> {
  final _formKey = GlobalKey<FormState>();
  final _noteNoController = TextEditingController();
  DateTime _transferDate = DateTime.now();
  String? _centerLocalId;

  @override
  void dispose() {
    _noteNoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final centers = ref.watch(centersProvider).maybeWhen(
          data: (items) => items,
          orElse: () => <CenterRecord>[],
        );

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _noteNoController,
            decoration: const InputDecoration(labelText: 'Transfer note no'),
            validator: (value) => value == null || value.trim().isEmpty ? 'Enter transfer note number' : null,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _transferDate,
                firstDate: DateTime(2020),
                lastDate: DateTime(2035),
              );
              if (picked != null) setState(() => _transferDate = picked);
            },
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(shortDateFormat.format(_transferDate)),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _centerLocalId,
            decoration: const InputDecoration(labelText: 'Collection center'),
            items: [
              for (final center in centers)
                DropdownMenuItem(
                  value: center.localId,
                  child: Text('${center.centerCode} - ${center.agent}', overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (value) => setState(() => _centerLocalId = value),
            validator: (value) => value == null ? 'Select collection center' : null,
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () async {
              if (!_formKey.currentState!.validate()) return;
              final localId = await ref.read(fieldRepositoryProvider).createTransferNote(
                    noteNo: _noteNoController.text.trim(),
                    transferDate: _transferDate,
                    centerLocalId: _centerLocalId!,
                  );
              unawaited(ref.read(mobileSyncServiceProvider).syncNow());
              if (context.mounted) {
                Navigator.of(context).pop();
                context.push('/field-collection/transfers/$localId');
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Create transfer note'),
          ),
        ],
      ),
    );
  }
}
