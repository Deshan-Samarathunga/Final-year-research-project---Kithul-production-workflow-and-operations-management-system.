import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'app_database.dart';

const _uuid = Uuid();

class IssueNoteView {
  const IssueNoteView({required this.note, required this.center});

  final IssueNoteRecord note;
  final CenterRecord? center;
}

class TransferNoteView {
  const TransferNoteView({required this.note, required this.center});

  final TransferNoteRecord note;
  final CenterRecord? center;
}

class FieldCollectionRepository {
  FieldCollectionRepository(this.db);

  final AppDatabase db;

  Future<void> ensureSeedData() async {
    final existingCenters = await (db.select(db.centers)..limit(1)).get();
    if (existingCenters.isNotEmpty) return;

    final now = DateTime.now();
    final ajith = _uuid.v4();
    final nai = _uuid.v4();
    final waru = _uuid.v4();
    final panni = _uuid.v4();
    final thini = _uuid.v4();

    await db.transaction(() async {
      await db.batch((batch) {
        batch.insertAll(db.centers, [
          CentersCompanion.insert(
            localId: ajith,
            remoteId: const Value('1'),
            centerCode: 'Ajith',
            location: 'Thiniyawala',
            agent: 'Chathura Maheepala',
            contactPhone: const Value(null),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
          CentersCompanion.insert(
            localId: nai,
            remoteId: const Value('2'),
            centerCode: 'C01-NAIWALA',
            location: 'Naiwala',
            agent: 'N/A',
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
          CentersCompanion.insert(
            localId: waru,
            remoteId: const Value('3'),
            centerCode: 'N002',
            location: 'Warukandeniya',
            agent: 'P A Dammika',
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
          CentersCompanion.insert(
            localId: panni,
            remoteId: const Value('4'),
            centerCode: 'N003',
            location: 'Pannimulla',
            agent: 'Saman Kumara',
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
          CentersCompanion.insert(
            localId: thini,
            remoteId: const Value('5'),
            centerCode: 'N006',
            location: 'Lankagama',
            agent: 'K S K Nethpriya',
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        ]);
      });

      final activeDate = DateTime(2026, 5, 4);
      await db.batch((batch) {
        batch.insertAll(db.issueNotes, [
          _issueSeed(
            'fgdgdgfdg',
            activeDate,
            ajith,
            ProductType.treacle,
            NoteStatus.active,
            0,
            0,
          ),
          _issueSeed(
            'wrwerewree',
            activeDate,
            ajith,
            ProductType.sap,
            NoteStatus.active,
            0,
            0,
          ),
          _issueSeed(
            '233rew',
            activeDate,
            ajith,
            ProductType.sap,
            NoteStatus.active,
            0,
            0,
          ),
          _issueSeed(
            'ISN/AK/04/05',
            DateTime(2026, 4, 27),
            ajith,
            ProductType.sap,
            NoteStatus.completed,
            3,
            28.20,
          ),
          _issueSeed(
            'ISN/DM/04/05',
            DateTime(2026, 4, 27),
            waru,
            ProductType.sap,
            NoteStatus.completed,
            15,
            150,
          ),
          _issueSeed(
            'ISN/SK/04/05',
            DateTime(2026, 4, 27),
            panni,
            ProductType.sap,
            NoteStatus.completed,
            9,
            61.50,
          ),
          _issueSeed(
            'TR-ISN/KR/04/05',
            DateTime(2026, 4, 27),
            thini,
            ProductType.treacle,
            NoteStatus.completed,
            12,
            157.03,
          ),
          _issueSeed(
            'ISN/CM/04/05',
            DateTime(2026, 4, 27),
            ajith,
            ProductType.sap,
            NoteStatus.completed,
            7,
            67.40,
          ),
          _issueSeed(
            'ISN/CM/04/04',
            DateTime(2026, 4, 23),
            ajith,
            ProductType.sap,
            NoteStatus.completed,
            6,
            57,
          ),
          _issueSeed(
            'ISN/AK/04/04',
            DateTime(2026, 4, 23),
            ajith,
            ProductType.sap,
            NoteStatus.completed,
            23,
            230,
          ),
          _issueSeed(
            'TR-ISN/KR/04/04',
            DateTime(2026, 4, 23),
            thini,
            ProductType.treacle,
            NoteStatus.completed,
            13,
            273,
          ),
        ]);
      });

      await db.batch((batch) {
        batch.insertAll(
          db.systemCans,
          List.generate(30, (index) {
            final code = 'AR${(index + 1).toString().padLeft(3, '0')}';
            return SystemCansCompanion.insert(
              localId: _uuid.v4(),
              canCode: code,
              status: Value(index % 9 == 0 ? 'Dispatched' : 'In warehouse'),
              agentName: index % 9 == 0
                  ? const Value('Kamal Kumara')
                  : const Value(null),
              reference: index % 9 == 0
                  ? const Value('TR-TFN/KK/05/02')
                  : const Value(null),
              createdAt: Value(now),
              updatedAt: Value(now),
            );
          }),
        );
      });
    });
  }

  IssueNotesCompanion _issueSeed(
    String name,
    DateTime date,
    String centerLocalId,
    String type,
    String status,
    int canCount,
    double totalQty,
  ) {
    final now = DateTime.now();
    return IssueNotesCompanion.insert(
      localId: _uuid.v4(),
      remoteId: Value(name),
      issueNoteName: name,
      collectionDate: date,
      centerLocalId: centerLocalId,
      type: type,
      status: Value(status),
      canCount: Value(canCount),
      totalQty: Value(totalQty),
      syncStatus: const Value(SyncStatus.synced),
      createdAt: Value(now),
      updatedAt: Value(now),
    );
  }

  Stream<List<CenterRecord>> watchCenters() {
    final query = db.select(db.centers)
      ..where((tbl) => tbl.status.equals('Active') & tbl.deletedAt.isNull())
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.centerCode)]);
    return query.watch();
  }

  Future<List<CenterRecord>> getCenters() {
    final query = db.select(db.centers)
      ..where((tbl) => tbl.status.equals('Active') & tbl.deletedAt.isNull())
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.centerCode)]);
    return query.get();
  }

  Stream<List<IssueNoteView>> watchIssueNotes(String status) {
    final query = db.select(db.issueNotes)
      ..where((tbl) => tbl.status.equals(status) & tbl.deletedAt.isNull())
      ..orderBy([
        (tbl) => OrderingTerm.desc(tbl.collectionDate),
        (tbl) => OrderingTerm.desc(tbl.updatedAt),
      ]);
    return query.watch().asyncMap((notes) async {
      final centers = await db.select(db.centers).get();
      final centerById = {for (final center in centers) center.localId: center};
      return [
        for (final note in notes)
          IssueNoteView(note: note, center: centerById[note.centerLocalId]),
      ];
    });
  }

  Future<IssueNoteView?> getIssueNote(String localId) async {
    final note = await (db.select(
      db.issueNotes,
    )..where((tbl) => tbl.localId.equals(localId))).getSingleOrNull();
    if (note == null) return null;
    final center =
        await (db.select(db.centers)
              ..where((tbl) => tbl.localId.equals(note.centerLocalId)))
            .getSingleOrNull();
    return IssueNoteView(note: note, center: center);
  }

  Stream<List<IssueNoteItemRecord>> watchIssueNoteItems(String noteLocalId) {
    final query = db.select(db.issueNoteItems)
      ..where(
        (tbl) =>
            tbl.issueNoteLocalId.equals(noteLocalId) & tbl.deletedAt.isNull(),
      )
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.createdAt)]);
    return query.watch();
  }

  Future<SystemCanRecord?> findSystemCan(String canCode) {
    final normalizedCode = canCode.trim().toUpperCase();
    return (db.select(db.systemCans)..where(
          (tbl) => tbl.canCode.equals(normalizedCode) & tbl.deletedAt.isNull(),
        ))
        .getSingleOrNull();
  }

  Future<String> createIssueNote({
    required String name,
    required DateTime collectionDate,
    required String centerLocalId,
    required String type,
  }) async {
    final now = DateTime.now();
    final localId = _uuid.v4();
    await db
        .into(db.issueNotes)
        .insert(
          IssueNotesCompanion.insert(
            localId: localId,
            issueNoteName: name,
            collectionDate: collectionDate,
            centerLocalId: centerLocalId,
            type: type,
            syncStatus: const Value(SyncStatus.pendingCreate),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
    await _enqueue('issue_note', localId, 'create', {'localId': localId});
    return localId;
  }

  Future<void> addIssueCan({
    required String issueNoteLocalId,
    required String canCode,
    required double quantity,
    required double phValue,
    required double brixValue,
  }) async {
    final now = DateTime.now();
    final localId = _uuid.v4();
    await db
        .into(db.issueNoteItems)
        .insert(
          IssueNoteItemsCompanion.insert(
            localId: localId,
            issueNoteLocalId: issueNoteLocalId,
            canCode: canCode.trim().toUpperCase(),
            quantity: quantity,
            phValue: Value(phValue),
            brixValue: Value(brixValue),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
    await _refreshIssueTotals(issueNoteLocalId);
    await _enqueue('issue_note_item', localId, 'create', {
      'issueNoteLocalId': issueNoteLocalId,
    });
  }

  Future<void> deleteIssueCan(
    String itemLocalId,
    String issueNoteLocalId,
  ) async {
    await (db.update(
      db.issueNoteItems,
    )..where((tbl) => tbl.localId.equals(itemLocalId))).write(
      IssueNoteItemsCompanion(
        deletedAt: Value(DateTime.now()),
        syncStatus: const Value(SyncStatus.pendingDelete),
      ),
    );
    await _refreshIssueTotals(issueNoteLocalId);
    await _enqueue('issue_note_item', itemLocalId, 'delete', {
      'issueNoteLocalId': issueNoteLocalId,
    });
  }

  Future<void> submitIssueNote(String localId) async {
    await _updateIssueStatus(localId, NoteStatus.completed);
  }

  Future<void> reopenIssueNote(String localId) async {
    await _updateIssueStatus(localId, NoteStatus.active);
  }

  Future<void> deleteIssueNote(String localId) async {
    await (db.update(
      db.issueNotes,
    )..where((tbl) => tbl.localId.equals(localId))).write(
      IssueNotesCompanion(
        deletedAt: Value(DateTime.now()),
        syncStatus: const Value(SyncStatus.pendingDelete),
      ),
    );
    await _enqueue('issue_note', localId, 'delete', {'localId': localId});
  }

  Future<void> _updateIssueStatus(String localId, String status) async {
    await (db.update(
      db.issueNotes,
    )..where((tbl) => tbl.localId.equals(localId))).write(
      IssueNotesCompanion(
        status: Value(status),
        syncStatus: const Value(SyncStatus.pendingUpdate),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await _enqueue('issue_note', localId, 'update', {'status': status});
  }

  Future<void> _refreshIssueTotals(String issueNoteLocalId) async {
    final items =
        await (db.select(db.issueNoteItems)..where(
              (tbl) =>
                  tbl.issueNoteLocalId.equals(issueNoteLocalId) &
                  tbl.deletedAt.isNull(),
            ))
            .get();
    final total = items.fold<double>(0, (sum, item) => sum + item.quantity);
    await (db.update(
      db.issueNotes,
    )..where((tbl) => tbl.localId.equals(issueNoteLocalId))).write(
      IssueNotesCompanion(
        canCount: Value(items.length),
        totalQty: Value(total),
        syncStatus: const Value(SyncStatus.pendingUpdate),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Stream<List<TransferNoteView>> watchTransferNotes(String status) {
    final query = db.select(db.transferNotes)
      ..where((tbl) => tbl.status.equals(status) & tbl.deletedAt.isNull())
      ..orderBy([
        (tbl) => OrderingTerm.desc(tbl.transferDate),
        (tbl) => OrderingTerm.desc(tbl.updatedAt),
      ]);
    return query.watch().asyncMap((notes) async {
      final centers = await db.select(db.centers).get();
      final centerById = {for (final center in centers) center.localId: center};
      return [
        for (final note in notes)
          TransferNoteView(note: note, center: centerById[note.centerLocalId]),
      ];
    });
  }

  Future<TransferNoteView?> getTransferNote(String localId) async {
    final note = await (db.select(
      db.transferNotes,
    )..where((tbl) => tbl.localId.equals(localId))).getSingleOrNull();
    if (note == null) return null;
    final center =
        await (db.select(db.centers)
              ..where((tbl) => tbl.localId.equals(note.centerLocalId)))
            .getSingleOrNull();
    return TransferNoteView(note: note, center: center);
  }

  Stream<List<TransferNoteItemRecord>> watchTransferNoteItems(
    String transferLocalId,
  ) {
    final query = db.select(db.transferNoteItems)
      ..where(
        (tbl) =>
            tbl.transferNoteLocalId.equals(transferLocalId) &
            tbl.deletedAt.isNull(),
      )
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.createdAt)]);
    return query.watch();
  }

  Future<String> createTransferNote({
    required String noteNo,
    required DateTime transferDate,
    required String centerLocalId,
  }) async {
    final now = DateTime.now();
    final localId = _uuid.v4();
    await db
        .into(db.transferNotes)
        .insert(
          TransferNotesCompanion.insert(
            localId: localId,
            transferNoteNo: noteNo,
            transferDate: transferDate,
            centerLocalId: centerLocalId,
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
    await _enqueue('transfer_note', localId, 'create', {'localId': localId});
    return localId;
  }

  Future<void> addTransferCan({
    required String transferLocalId,
    required String canCode,
  }) async {
    final now = DateTime.now();
    final localId = _uuid.v4();
    await db
        .into(db.transferNoteItems)
        .insert(
          TransferNoteItemsCompanion.insert(
            localId: localId,
            transferNoteLocalId: transferLocalId,
            canCode: canCode.trim().toUpperCase(),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
    await _refreshTransferCount(transferLocalId);
    await _enqueue('transfer_note_item', localId, 'create', {
      'transferLocalId': transferLocalId,
    });
  }

  Future<void> deleteTransferCan(
    String itemLocalId,
    String transferLocalId,
  ) async {
    await (db.update(
      db.transferNoteItems,
    )..where((tbl) => tbl.localId.equals(itemLocalId))).write(
      TransferNoteItemsCompanion(
        deletedAt: Value(DateTime.now()),
        syncStatus: const Value(SyncStatus.pendingDelete),
      ),
    );
    await _refreshTransferCount(transferLocalId);
    await _enqueue('transfer_note_item', itemLocalId, 'delete', {
      'transferLocalId': transferLocalId,
    });
  }

  Future<void> completeTransferNote(String localId) async {
    await (db.update(
      db.transferNotes,
    )..where((tbl) => tbl.localId.equals(localId))).write(
      TransferNotesCompanion(
        status: const Value(NoteStatus.completed),
        syncStatus: const Value(SyncStatus.pendingUpdate),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await _enqueue('transfer_note', localId, 'update', {
      'status': NoteStatus.completed,
    });
  }

  Future<void> _refreshTransferCount(String transferLocalId) async {
    final items =
        await (db.select(db.transferNoteItems)..where(
              (tbl) =>
                  tbl.transferNoteLocalId.equals(transferLocalId) &
                  tbl.deletedAt.isNull(),
            ))
            .get();
    await (db.update(
      db.transferNotes,
    )..where((tbl) => tbl.localId.equals(transferLocalId))).write(
      TransferNotesCompanion(
        canCount: Value(items.length),
        syncStatus: const Value(SyncStatus.pendingUpdate),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Stream<int> watchPendingSyncCount() {
    final query = db.select(db.syncOutbox)
      ..where(
        (tbl) => tbl.status.equals('pending') | tbl.status.equals('failed'),
      );
    return query.watch().map((rows) => rows.length);
  }

  Future<void> _enqueue(
    String entityType,
    String entityLocalId,
    String action,
    Map<String, Object?> payload,
  ) async {
    await db
        .into(db.syncOutbox)
        .insert(
          SyncOutboxCompanion.insert(
            localId: _uuid.v4(),
            entityType: entityType,
            entityLocalId: entityLocalId,
            action: action,
            payload: jsonEncode(payload),
          ),
        );
  }
}
