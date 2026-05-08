import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';
import 'field_repository.dart';

final databaseProvider = Provider<AppDatabase>((ref) {
  final database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});

final fieldRepositoryProvider = Provider<FieldCollectionRepository>((ref) {
  return FieldCollectionRepository(ref.watch(databaseProvider));
});

final seedDataProvider = FutureProvider<void>((ref) async {
  await ref.watch(fieldRepositoryProvider).ensureSeedData();
});

final centersProvider = StreamProvider<List<CenterRecord>>((ref) {
  ref.watch(seedDataProvider);
  return ref.watch(fieldRepositoryProvider).watchCenters();
});

final issueNotesProvider = StreamProvider.family<List<IssueNoteView>, String>((ref, status) {
  ref.watch(seedDataProvider);
  return ref.watch(fieldRepositoryProvider).watchIssueNotes(status);
});

final issueNoteItemsProvider = StreamProvider.family<List<IssueNoteItemRecord>, String>((ref, noteLocalId) {
  return ref.watch(fieldRepositoryProvider).watchIssueNoteItems(noteLocalId);
});

final transferNotesProvider = StreamProvider.family<List<TransferNoteView>, String>((ref, status) {
  ref.watch(seedDataProvider);
  return ref.watch(fieldRepositoryProvider).watchTransferNotes(status);
});

final transferNoteItemsProvider = StreamProvider.family<List<TransferNoteItemRecord>, String>((ref, transferLocalId) {
  return ref.watch(fieldRepositoryProvider).watchTransferNoteItems(transferLocalId);
});

final pendingSyncCountProvider = StreamProvider<int>((ref) {
  return ref.watch(fieldRepositoryProvider).watchPendingSyncCount();
});
