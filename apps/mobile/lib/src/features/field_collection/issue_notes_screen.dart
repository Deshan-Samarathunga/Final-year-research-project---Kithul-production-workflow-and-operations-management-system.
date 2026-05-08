import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_database.dart';
import '../../data/field_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class IssueNotesScreen extends ConsumerStatefulWidget {
  const IssueNotesScreen({super.key});

  @override
  ConsumerState<IssueNotesScreen> createState() => _IssueNotesScreenState();
}

class _IssueNotesScreenState extends ConsumerState<IssueNotesScreen> {
  String _status = NoteStatus.active;

  @override
  Widget build(BuildContext context) {
    final seed = ref.watch(seedDataProvider);
    final activeCount = ref.watch(issueNotesProvider(NoteStatus.active)).maybeWhen(
          data: (items) => items.length,
          orElse: () => 0,
        );
    final completedCount = ref.watch(issueNotesProvider(NoteStatus.completed)).maybeWhen(
          data: (items) => items.length,
          orElse: () => 0,
        );

    return Scaffold(
      appBar: KithulAppBar(
        title: 'Field Collection',
        subtitle: 'Issue notes',
        actions: [
          IconButton(
            tooltip: 'Transfer notes',
            onPressed: () => context.push('/field-collection/transfers'),
            icon: const Icon(Icons.local_shipping_outlined),
          ),
        ],
      ),
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
                          onPressed: () => context.push('/field-collection/transfers'),
                          icon: const Icon(Icons.arrow_forward),
                          label: const Text('Transfer notes'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => _showIssueNoteSheet(context, ref),
                          icon: const Icon(Icons.add),
                          label: const Text('New issue note'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(child: _IssueNoteList(status: _status)),
          ],
        ),
      ),
    );
  }
}

class _IssueNoteList extends ConsumerWidget {
  const _IssueNoteList({required this.status});

  final String status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(issueNotesProvider(status));
    return notes.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Could not load issue notes: $error')),
      data: (items) {
        if (items.isEmpty) {
          return EmptyState(
            icon: Icons.assignment_outlined,
            title: status == NoteStatus.active ? 'No active issue notes yet' : 'No completed issue notes yet',
            message: status == NoteStatus.active
                ? 'Create a new issue note before visiting a collection center.'
                : 'Submitted notes will appear here.',
            action: status == NoteStatus.active
                ? FilledButton.icon(
                    onPressed: () => _showIssueNoteSheet(context, ref),
                    icon: const Icon(Icons.add),
                    label: const Text('New issue note'),
                  )
                : null,
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) => _IssueNoteCard(view: items[index]),
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemCount: items.length,
        );
      },
    );
  }
}

class _IssueNoteCard extends ConsumerWidget {
  const _IssueNoteCard({required this.view});

  final IssueNoteView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final note = view.note;
    final center = view.center;
    final isCompleted = note.status == NoteStatus.completed;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(note.issueNoteName, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      Text(
                        '${shortDateFormat.format(note.collectionDate)} - ${center?.agent ?? 'No agent'}',
                        style: const TextStyle(color: kithulMuted),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: note.status),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: 'Type', value: note.type, color: kithulOrange),
                MetricChip(label: 'Cans', value: note.canCount.toString()),
                MetricChip(label: 'Total qty', value: quantityFormat.format(note.totalQty), color: kithulGreen),
              ],
            ),
            const SizedBox(height: 14),
            if (isCompleted)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/field-collection/notes/${note.localId}'),
                      icon: const Icon(Icons.search),
                      label: const Text('View'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () async {
                        await ref.read(fieldRepositoryProvider).reopenIssueNote(note.localId);
                        unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                      },
                      icon: const Icon(Icons.restart_alt),
                      label: const Text('Reopen'),
                    ),
                  ),
                ],
              )
            else
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/field-collection/notes/${note.localId}'),
                          icon: const Icon(Icons.arrow_forward),
                          label: const Text('Continue'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () async {
                            await ref.read(fieldRepositoryProvider).submitIssueNote(note.localId);
                            unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                          },
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Submit'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(backgroundColor: Colors.red.shade600),
                      onPressed: () async {
                        await ref.read(fieldRepositoryProvider).deleteIssueNote(note.localId);
                        unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                      },
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Delete'),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

Future<void> _showIssueNoteSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const FormSheet(
      title: 'Create issue note',
      subtitle: 'Provide the collection details for offline entry.',
      child: _CreateIssueNoteForm(),
    ),
  );
}

class _CreateIssueNoteForm extends ConsumerStatefulWidget {
  const _CreateIssueNoteForm();

  @override
  ConsumerState<_CreateIssueNoteForm> createState() => _CreateIssueNoteFormState();
}

class _CreateIssueNoteFormState extends ConsumerState<_CreateIssueNoteForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  DateTime _collectionDate = DateTime.now();
  String? _centerLocalId;
  String _type = ProductType.sap;

  @override
  void dispose() {
    _nameController.dispose();
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
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Issue note name'),
            validator: (value) => value == null || value.trim().isEmpty ? 'Enter issue note name' : null,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _collectionDate,
                firstDate: DateTime(2020),
                lastDate: DateTime(2035),
              );
              if (picked != null) setState(() => _collectionDate = picked);
            },
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(shortDateFormat.format(_collectionDate)),
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
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Issue note type'),
            items: const [
              DropdownMenuItem(value: ProductType.sap, child: Text(ProductType.sap)),
              DropdownMenuItem(value: ProductType.treacle, child: Text(ProductType.treacle)),
            ],
            onChanged: (value) => setState(() => _type = value ?? ProductType.sap),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () async {
              if (!_formKey.currentState!.validate()) return;
              await ref.read(fieldRepositoryProvider).createIssueNote(
                    name: _nameController.text.trim(),
                    collectionDate: _collectionDate,
                    centerLocalId: _centerLocalId!,
                    type: _type,
                  );
              unawaited(ref.read(mobileSyncServiceProvider).syncNow());
              if (context.mounted) Navigator.of(context).pop();
            },
            icon: const Icon(Icons.add),
            label: const Text('Create issue note'),
          ),
        ],
      ),
    );
  }
}
