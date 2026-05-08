import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'app_database.dart';
import 'auth_repository.dart';
import 'field_repository.dart';
import 'sync_service.dart';

final databaseProvider = Provider<AppDatabase>((ref) {
  final database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});

final fieldRepositoryProvider = Provider<FieldCollectionRepository>((ref) {
  return FieldCollectionRepository(ref.watch(databaseProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(databaseProvider));
});

final mobileSyncServiceProvider = Provider<MobileSyncService>((ref) {
  return MobileSyncService(ref.watch(databaseProvider), ref.watch(authRepositoryProvider));
});

final sessionProvider = FutureProvider<MobileSession?>((ref) {
  return ref.watch(authRepositoryProvider).getSession();
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

final syncMetadataProvider = StreamProvider<Map<String, String>>((ref) {
  final db = ref.watch(databaseProvider);
  return db.select(db.syncMetadata).watch().map((rows) => {
        for (final row in rows) row.key: row.value,
      });
});

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});
