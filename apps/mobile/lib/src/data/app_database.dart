import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

class SyncStatus {
  static const synced = 'synced';
  static const pendingCreate = 'pendingCreate';
  static const pendingUpdate = 'pendingUpdate';
  static const pendingDelete = 'pendingDelete';
  static const failed = 'failed';
}

class NoteStatus {
  static const active = 'Active';
  static const completed = 'Completed';
}

class ProductType {
  static const fieldCollection = 'Field collection';
  static const directCollection = 'Direct collection';
  static const transferReturn = 'Transfer return';
}

@DataClassName('CenterRecord')
class Centers extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get centerCode => text()();
  TextColumn get location => text()();
  TextColumn get agent => text()();
  TextColumn get contactPhone => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('Active'))();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.synced))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('SystemCanRecord')
class SystemCans extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get canCode => text().unique()();
  TextColumn get status => text().withDefault(const Constant('In warehouse'))();
  TextColumn get agentName => text().nullable()();
  TextColumn get reference => text().nullable()();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.synced))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('IssueNoteRecord')
class IssueNotes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get issueNoteName => text()();
  DateTimeColumn get collectionDate => dateTime()();
  TextColumn get centerLocalId => text()();
  TextColumn get type => text()();
  TextColumn get status =>
      text().withDefault(const Constant(NoteStatus.active))();
  IntColumn get canCount => integer().withDefault(const Constant(0))();
  RealColumn get totalQty => real().withDefault(const Constant(0))();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.synced))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('IssueNoteItemRecord')
class IssueNoteItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get issueNoteLocalId => text()();
  TextColumn get canCode => text()();
  RealColumn get quantity => real()();
  RealColumn get phValue => real().withDefault(const Constant(0))();
  RealColumn get brixValue => real().withDefault(const Constant(0))();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.pendingCreate))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('TransferNoteRecord')
class TransferNotes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get transferNoteNo => text()();
  DateTimeColumn get transferDate => dateTime()();
  TextColumn get centerLocalId => text()();
  TextColumn get status =>
      text().withDefault(const Constant(NoteStatus.active))();
  IntColumn get canCount => integer().withDefault(const Constant(0))();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.pendingCreate))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('TransferNoteItemRecord')
class TransferNoteItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get remoteId => text().nullable()();
  TextColumn get transferNoteLocalId => text()();
  TextColumn get canCode => text()();
  TextColumn get syncStatus =>
      text().withDefault(const Constant(SyncStatus.pendingCreate))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
}

@DataClassName('SyncOutboxRecord')
class SyncOutbox extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get localId => text().unique()();
  TextColumn get entityType => text()();
  TextColumn get entityLocalId => text()();
  TextColumn get action => text()();
  TextColumn get payload => text()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('SyncMetadataRecord')
class SyncMetadata extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

@DriftDatabase(
  tables: [
    Centers,
    SystemCans,
    IssueNotes,
    IssueNoteItems,
    TransferNotes,
    TransferNoteItems,
    SyncOutbox,
    SyncMetadata,
  ],
)
final class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onUpgrade: (migrator, from, to) async {
      if (from < 2) {
        await migrator.addColumn(issueNoteItems, issueNoteItems.remoteId);
        await migrator.addColumn(transferNoteItems, transferNoteItems.remoteId);
      }
      if (from < 3) {
        await migrator.addColumn(issueNoteItems, issueNoteItems.phValue);
        await migrator.addColumn(issueNoteItems, issueNoteItems.brixValue);
      }
    },
  );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final directory = await getApplicationDocumentsDirectory();
    final file = File(p.join(directory.path, 'kithulflow_mobile.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
