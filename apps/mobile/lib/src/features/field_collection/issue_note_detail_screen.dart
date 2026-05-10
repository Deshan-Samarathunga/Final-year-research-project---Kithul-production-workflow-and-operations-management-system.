import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme.dart';
import '../../data/app_database.dart';
import '../../data/field_repository.dart';
import '../../data/providers.dart';
import '../shared/kithul_widgets.dart';

class IssueNoteDetailScreen extends ConsumerStatefulWidget {
  const IssueNoteDetailScreen({super.key, required this.noteLocalId});

  final String noteLocalId;

  @override
  ConsumerState<IssueNoteDetailScreen> createState() =>
      _IssueNoteDetailScreenState();
}

class _IssueNoteDetailScreenState extends ConsumerState<IssueNoteDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _canController = TextEditingController();
  final _quantityController = TextEditingController();
  final _phController = TextEditingController();
  final _brixController = TextEditingController();
  final _temperatureController = TextEditingController();
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
    _phController.dispose();
    _brixController.dispose();
    _temperatureController.dispose();
    super.dispose();
  }

  void _reload() {
    _noteFuture = ref
        .read(fieldRepositoryProvider)
        .getIssueNote(widget.noteLocalId);
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(issueNoteItemsProvider(widget.noteLocalId));

    return Scaffold(
      appBar: const KithulAppBar(
        title: 'Issue Note',
        subtitle: 'Can quantities',
        showBack: true,
      ),
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
              if (canEdit)
                _AddCanForm(
                  formKey: _formKey,
                  canController: _canController,
                  quantityController: _quantityController,
                  phController: _phController,
                  brixController: _brixController,
                  temperatureController: _temperatureController,
                  requireTemperature: note.type == ProductType.sap,
                  onScan: _scanCanCode,
                  onAdd: _addCan,
                ),
              if (!canEdit)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(14),
                    child: Text(
                      'This completed note is read-only. Reopen it to add or remove cans.',
                    ),
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
                    await ref
                        .read(fieldRepositoryProvider)
                        .deleteIssueCan(itemLocalId, widget.noteLocalId);
                    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                    setState(_reload);
                  },
                ),
              ),
              const SizedBox(height: 16),
              if (note.status == NoteStatus.active)
                FilledButton.icon(
                  onPressed: () async {
                    await ref
                        .read(fieldRepositoryProvider)
                        .submitIssueNote(widget.noteLocalId);
                    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
                    setState(_reload);
                  },
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Submit issue note'),
                )
              else
                FilledButton.icon(
                  onPressed: () async {
                    await ref
                        .read(fieldRepositoryProvider)
                        .reopenIssueNote(widget.noteLocalId);
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
    final canCode = _canController.text.trim().toUpperCase();
    final can = await ref.read(fieldRepositoryProvider).findSystemCan(canCode);
    if (can == null) {
      final confirmed = await _confirmUnknownCan(canCode);
      if (!confirmed) return;
    }

    await ref
        .read(fieldRepositoryProvider)
        .addIssueCan(
          issueNoteLocalId: widget.noteLocalId,
          canCode: canCode,
          quantity: double.parse(_quantityController.text),
          phValue: double.parse(_phController.text),
          brixValue: double.parse(_brixController.text),
          temperatureC: _temperatureController.text.trim().isEmpty
              ? null
              : double.parse(_temperatureController.text),
        );
    _canController.clear();
    _quantityController.clear();
    _phController.clear();
    _brixController.clear();
    _temperatureController.clear();
    unawaited(ref.read(mobileSyncServiceProvider).syncNow());
    setState(_reload);
  }

  Future<void> _scanCanCode() async {
    final scannedValue = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const _QrScanSheet(),
    );
    if (scannedValue == null || scannedValue.trim().isEmpty) return;

    final canCode = scannedValue.trim().toUpperCase();
    _canController.text = canCode;
    final can = await ref.read(fieldRepositoryProvider).findSystemCan(canCode);
    if (!mounted) return;
    if (can == null) {
      _snack(
        context,
        '$canCode is not in local cans. Sync first or confirm manually when adding.',
      );
    }
  }

  Future<bool> _confirmUnknownCan(String canCode) async {
    if (!mounted) return false;
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Unknown can'),
            content: Text(
              '$canCode is not in local system cans. Sync first if this can should exist, or confirm to use it anyway.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Use anyway'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _snack(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
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
                Expanded(
                  child: Text(
                    note.issueNoteName,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                StatusBadge(label: note.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${note.type} - ${shortDateFormat.format(note.collectionDate)}',
              style: const TextStyle(color: kithulMuted),
            ),
            const SizedBox(height: 4),
            Text(
              view.center?.agent ?? 'No center agent',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: 'Can count', value: note.canCount.toString()),
                MetricChip(
                  label: 'Total qty',
                  value: quantityFormat.format(note.totalQty),
                  color: kithulGreen,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AddCanForm extends StatelessWidget {
  const _AddCanForm({
    required this.formKey,
    required this.canController,
    required this.quantityController,
    required this.phController,
    required this.brixController,
    required this.temperatureController,
    required this.requireTemperature,
    required this.onScan,
    required this.onAdd,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController canController;
  final TextEditingController quantityController;
  final TextEditingController phController;
  final TextEditingController brixController;
  final TextEditingController temperatureController;
  final bool requireTemperature;
  final VoidCallback onScan;
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
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: canController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Select / Type Can ID',
                        prefixIcon: Icon(Icons.search),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                          ? 'Enter can ID'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 56,
                    child: OutlinedButton.icon(
                      onPressed: onScan,
                      icon: const Icon(Icons.qr_code_scanner),
                      label: const Text('Scan QR'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: quantityController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
                decoration: const InputDecoration(labelText: 'Quantity'),
                validator: (value) {
                  final qty = double.tryParse(value ?? '');
                  if (qty == null) return 'Enter quantity';
                  if (qty <= 0) return 'Quantity must be more than 0';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: phController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                      ],
                      decoration: const InputDecoration(labelText: 'pH value'),
                      validator: (value) {
                        final ph = double.tryParse(value ?? '');
                        if (ph == null) return 'Enter pH value';
                        if (ph < 0 || ph > 14) return 'pH must be 0-14';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: brixController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                      ],
                      decoration: const InputDecoration(labelText: 'Brix'),
                      validator: (value) {
                        final brix = double.tryParse(value ?? '');
                        if (brix == null) return 'Enter Brix';
                        if (brix < 0) return 'Brix must be 0 or more';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              if (requireTemperature) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: temperatureController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Temperature (C)',
                  ),
                  validator: (value) {
                    final temperature = double.tryParse(value ?? '');
                    if (temperature == null) return 'Enter temperature';
                    if (temperature < 0) {
                      return 'Temperature must be 0 or more';
                    }
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add),
                label: const Text('Add'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CanList extends StatelessWidget {
  const _CanList({
    required this.items,
    required this.canEdit,
    required this.onDelete,
  });

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
                title: Text(
                  item.canCode,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  'Quantity ${quantityFormat.format(item.quantity)}  |  pH ${quantityFormat.format(item.phValue)}  |  Brix ${quantityFormat.format(item.brixValue)}${item.temperatureC == null ? '' : '  |  Temp ${quantityFormat.format(item.temperatureC!)}C'}',
                ),
                trailing: canEdit
                    ? IconButton(
                        tooltip: 'Delete can',
                        onPressed: () => onDelete(item.localId),
                        icon: Icon(
                          Icons.delete_outline,
                          color: Colors.red.shade600,
                        ),
                      )
                    : null,
              ),
            ),
          ),
      ],
    );
  }
}

class _QrScanSheet extends StatefulWidget {
  const _QrScanSheet();

  @override
  State<_QrScanSheet> createState() => _QrScanSheetState();
}

class _QrScanSheetState extends State<_QrScanSheet> {
  final _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  bool _handled = false;

  @override
  void dispose() {
    unawaited(_controller.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.78,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Scan can QR',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: 'Close scanner',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Point the camera at a KithulFlow system can QR label.',
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: MobileScanner(
                controller: _controller,
                onDetect: (capture) {
                  if (_handled) return;
                  final barcode = capture.barcodes.isEmpty
                      ? null
                      : capture.barcodes.first;
                  final rawValue = barcode?.rawValue?.trim();
                  if (rawValue == null || rawValue.isEmpty) return;
                  _handled = true;
                  Navigator.of(context).pop(rawValue.toUpperCase());
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
