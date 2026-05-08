import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'app_database.dart';
import 'auth_repository.dart';

const _uuid = Uuid();

class SyncResult {
  const SyncResult({required this.synced, required this.message});

  final bool synced;
  final String message;
}

class MobileSyncService {
  MobileSyncService(
    this.db,
    this.authRepository, {
    Dio? dio,
    Connectivity? connectivity,
  }) : _dio = dio ?? Dio(),
       _connectivity = connectivity ?? Connectivity();

  final AppDatabase db;
  final AuthRepository authRepository;
  final Dio _dio;
  final Connectivity _connectivity;

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return results.any((result) => result != ConnectivityResult.none);
  }

  Future<SyncResult> testConnection(String serverUrl) async {
    final url = authRepository.normalizeServerUrl(serverUrl);
    final response = await _dio.get<Map<String, Object?>>(
      '$url/api/mobile/health',
    );
    return SyncResult(
      synced: response.statusCode == 200,
      message: 'Connected to $url',
    );
  }

  Future<SyncResult> syncNow() async {
    try {
      final session = await authRepository.getSession();
      if (session == null) {
        return const SyncResult(
          synced: false,
          message: 'Login required before syncing',
        );
      }

      if (!await isOnline) {
        return const SyncResult(
          synced: false,
          message: 'Phone is offline. Changes stay saved locally.',
        );
      }

      final changes = await _buildPendingPayload();
      final response = await _dio.post<Map<String, Object?>>(
        '${session.serverUrl}/api/mobile/sync',
        data: {'changes': changes},
        options: Options(
          headers: {
            'Authorization': 'Bearer ${session.token}',
            'Content-Type': 'application/json',
          },
        ),
      );

      await _markPendingAsSynced();
      final body = response.data ?? {};
      final bootstrap = body['bootstrap'];
      if (bootstrap is Map<String, Object?>) {
        await applyBootstrap(bootstrap);
      } else {
        await pullReferenceData();
      }
      await authRepository.setMetadata(
        AuthRepository.lastSyncAtKey,
        DateTime.now().toIso8601String(),
      );
      await authRepository.setMetadata(AuthRepository.lastSyncErrorKey, '');
      return const SyncResult(synced: true, message: 'Sync completed');
    } catch (error) {
      await _markOutboxFailed(error.toString());
      await authRepository.setMetadata(
        AuthRepository.lastSyncErrorKey,
        error.toString(),
      );
      return SyncResult(synced: false, message: error.toString());
    }
  }

  Future<void> pullReferenceData() async {
    final session = await authRepository.getSession();
    if (session == null || !await isOnline) return;

    final response = await _dio.get<Map<String, Object?>>(
      '${session.serverUrl}/api/mobile/bootstrap',
      options: Options(headers: {'Authorization': 'Bearer ${session.token}'}),
    );
    final body = response.data;
    if (body != null) {
      await applyBootstrap(body);
      await authRepository.setMetadata(
        AuthRepository.lastSyncAtKey,
        DateTime.now().toIso8601String(),
      );
      await authRepository.setMetadata(AuthRepository.lastSyncErrorKey, '');
    }
  }

  Future<void> applyBootstrap(Map<String, Object?> bootstrap) async {
    final centers = (bootstrap['centers'] as List? ?? const [])
        .whereType<Map<String, Object?>>();
    final cans = (bootstrap['systemCans'] as List? ?? const [])
        .whereType<Map<String, Object?>>();
    final issueNotes = (bootstrap['issueNotes'] as List? ?? const [])
        .whereType<Map<String, Object?>>();
    final transferNotes = (bootstrap['transferNotes'] as List? ?? const [])
        .whereType<Map<String, Object?>>();

    await db.transaction(() async {
      for (final center in centers) {
        await _upsertCenter(center);
      }
      for (final can in cans) {
        await _upsertSystemCan(can);
      }
      for (final note in issueNotes) {
        await _upsertIssueNote(note);
      }
      for (final note in transferNotes) {
        await _upsertTransferNote(note);
      }
    });
  }

  Future<Map<String, Object?>> _buildPendingPayload() async {
    final issueNotes = (await db.select(db.issueNotes).get()).where(
      (row) => row.syncStatus != SyncStatus.synced,
    );
    final issueNoteItems = (await db.select(db.issueNoteItems).get()).where(
      (row) => row.syncStatus != SyncStatus.synced,
    );
    final transferNotes = (await db.select(db.transferNotes).get()).where(
      (row) => row.syncStatus != SyncStatus.synced,
    );
    final transferNoteItems = (await db.select(db.transferNoteItems).get())
        .where((row) => row.syncStatus != SyncStatus.synced);
    final centers = await db.select(db.centers).get();
    final centerByLocalId = {
      for (final center in centers) center.localId: center,
    };

    return {
      'issueNotes': [
        for (final note in issueNotes)
          {
            'localId': note.localId,
            'remoteId': note.remoteId,
            'issueNoteName': note.issueNoteName,
            'collectionDate': note.collectionDate.toIso8601String(),
            'centerLocalId': note.centerLocalId,
            'centerRemoteId': centerByLocalId[note.centerLocalId]?.remoteId,
            'centerCode': centerByLocalId[note.centerLocalId]?.centerCode,
            'type': note.type,
            'status': note.status,
            'canCount': note.canCount,
            'totalQty': note.totalQty,
            'updatedAt': note.updatedAt.toIso8601String(),
            'deletedAt': note.deletedAt?.toIso8601String(),
          },
      ],
      'issueNoteItems': [
        for (final item in issueNoteItems)
          {
            'localId': item.localId,
            'remoteId': item.remoteId,
            'issueNoteLocalId': item.issueNoteLocalId,
            'canCode': item.canCode,
            'quantity': item.quantity,
            'phValue': item.phValue,
            'brixValue': item.brixValue,
            'updatedAt': item.updatedAt.toIso8601String(),
            'deletedAt': item.deletedAt?.toIso8601String(),
          },
      ],
      'transferNotes': [
        for (final note in transferNotes)
          {
            'localId': note.localId,
            'remoteId': note.remoteId,
            'transferNoteNo': note.transferNoteNo,
            'transferDate': note.transferDate.toIso8601String(),
            'centerLocalId': note.centerLocalId,
            'centerRemoteId': centerByLocalId[note.centerLocalId]?.remoteId,
            'centerCode': centerByLocalId[note.centerLocalId]?.centerCode,
            'status': note.status,
            'canCount': note.canCount,
            'updatedAt': note.updatedAt.toIso8601String(),
            'deletedAt': note.deletedAt?.toIso8601String(),
          },
      ],
      'transferNoteItems': [
        for (final item in transferNoteItems)
          {
            'localId': item.localId,
            'remoteId': item.remoteId,
            'transferNoteLocalId': item.transferNoteLocalId,
            'canCode': item.canCode,
            'updatedAt': item.updatedAt.toIso8601String(),
            'deletedAt': item.deletedAt?.toIso8601String(),
          },
      ],
    };
  }

  Future<void> _markPendingAsSynced() async {
    final now = DateTime.now();
    await (db.update(
      db.issueNotes,
    )..where((tbl) => tbl.syncStatus.equals(SyncStatus.synced).not())).write(
      IssueNotesCompanion(
        syncStatus: const Value(SyncStatus.synced),
        updatedAt: Value(now),
      ),
    );
    await (db.update(
      db.issueNoteItems,
    )..where((tbl) => tbl.syncStatus.equals(SyncStatus.synced).not())).write(
      IssueNoteItemsCompanion(
        syncStatus: const Value(SyncStatus.synced),
        updatedAt: Value(now),
      ),
    );
    await (db.update(
      db.transferNotes,
    )..where((tbl) => tbl.syncStatus.equals(SyncStatus.synced).not())).write(
      TransferNotesCompanion(
        syncStatus: const Value(SyncStatus.synced),
        updatedAt: Value(now),
      ),
    );
    await (db.update(
      db.transferNoteItems,
    )..where((tbl) => tbl.syncStatus.equals(SyncStatus.synced).not())).write(
      TransferNoteItemsCompanion(
        syncStatus: const Value(SyncStatus.synced),
        updatedAt: Value(now),
      ),
    );
    await (db.update(db.syncOutbox)..where(
          (tbl) => tbl.status.equals('pending') | tbl.status.equals('failed'),
        ))
        .write(
          SyncOutboxCompanion(
            status: const Value('synced'),
            updatedAt: Value(now),
          ),
        );
  }

  Future<void> _markOutboxFailed(String error) async {
    final rows =
        await (db.select(db.syncOutbox)..where(
              (tbl) =>
                  tbl.status.equals('pending') | tbl.status.equals('failed'),
            ))
            .get();
    for (final row in rows) {
      await (db.update(
        db.syncOutbox,
      )..where((tbl) => tbl.localId.equals(row.localId))).write(
        SyncOutboxCompanion(
          status: const Value('failed'),
          attempts: Value(row.attempts + 1),
          lastError: Value(error),
          updatedAt: Value(DateTime.now()),
        ),
      );
    }
  }

  Future<void> _upsertCenter(Map<String, Object?> data) async {
    final remoteId = '${data['id']}';
    final centerCode = '${data['centerId']}';
    final existing = await _findCenter(
      remoteId: remoteId,
      centerCode: centerCode,
    );
    final companion = CentersCompanion(
      remoteId: Value(remoteId),
      centerCode: Value(centerCode),
      location: Value('${data['location']}'),
      agent: Value('${data['agent']}'),
      contactPhone: Value(data['contactPhone'] as String?),
      status: Value('${data['status'] ?? 'Active'}'),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.centers)
          .insert(
            companion.copyWith(
              localId: Value(_uuid.v4()),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else {
      await (db.update(
        db.centers,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }
  }

  Future<void> _upsertSystemCan(Map<String, Object?> data) async {
    final canCode = '${data['canCode']}';
    final existing = await (db.select(
      db.systemCans,
    )..where((tbl) => tbl.canCode.equals(canCode))).getSingleOrNull();
    final companion = SystemCansCompanion(
      remoteId: Value('${data['id']}'),
      canCode: Value(canCode),
      status: Value('${data['status'] ?? 'In warehouse'}'),
      agentName: Value(data['agentName'] as String?),
      reference: Value(data['reference'] as String?),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.systemCans)
          .insert(
            companion.copyWith(
              localId: Value(_uuid.v4()),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else {
      await (db.update(
        db.systemCans,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }
  }

  Future<void> _upsertIssueNote(Map<String, Object?> data) async {
    final remoteId = '${data['id']}';
    final mobileLocalId = data['mobileLocalId'] as String?;
    final center = data['center'] is Map<String, Object?>
        ? data['center'] as Map<String, Object?>
        : null;
    final centerRecord = center == null
        ? null
        : await _findCenter(
            remoteId: '${center['id']}',
            centerCode: center['centerId'] as String?,
          );
    final existing = await _findIssueNote(
      remoteId: remoteId,
      mobileLocalId: mobileLocalId,
    );
    final localId = existing?.localId ?? mobileLocalId ?? _uuid.v4();
    final companion = IssueNotesCompanion(
      remoteId: Value(remoteId),
      issueNoteName: Value('${data['issueNoteName']}'),
      collectionDate: Value(
        _parseDate(data['collectionDate']) ?? DateTime.now(),
      ),
      centerLocalId: Value(
        centerRecord?.localId ?? existing?.centerLocalId ?? '',
      ),
      type: Value('${data['type']}'),
      status: Value('${data['status'] ?? NoteStatus.active}'),
      canCount: Value((data['canCount'] as num?)?.toInt() ?? 0),
      totalQty: Value((data['totalQty'] as num?)?.toDouble() ?? 0),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.issueNotes)
          .insert(
            companion.copyWith(
              localId: Value(localId),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else if (existing.syncStatus == SyncStatus.synced) {
      await (db.update(
        db.issueNotes,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }

    final items = (data['items'] as List? ?? const [])
        .whereType<Map<String, Object?>>();
    for (final item in items) {
      await _upsertIssueNoteItem(item, localId);
    }
  }

  Future<void> _upsertIssueNoteItem(
    Map<String, Object?> data,
    String issueNoteLocalId,
  ) async {
    final remoteId = '${data['id']}';
    final mobileLocalId = data['mobileLocalId'] as String?;
    final existing = await _findIssueNoteItem(
      remoteId: remoteId,
      mobileLocalId: mobileLocalId,
    );
    final companion = IssueNoteItemsCompanion(
      remoteId: Value(remoteId),
      issueNoteLocalId: Value(issueNoteLocalId),
      canCode: Value('${data['canCode']}'),
      quantity: Value((data['quantity'] as num?)?.toDouble() ?? 0),
      phValue: Value((data['phValue'] as num?)?.toDouble() ?? 0),
      brixValue: Value((data['brixValue'] as num?)?.toDouble() ?? 0),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.issueNoteItems)
          .insert(
            companion.copyWith(
              localId: Value(mobileLocalId ?? _uuid.v4()),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else if (existing.syncStatus == SyncStatus.synced) {
      await (db.update(
        db.issueNoteItems,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }
  }

  Future<void> _upsertTransferNote(Map<String, Object?> data) async {
    final remoteId = '${data['id']}';
    final mobileLocalId = data['mobileLocalId'] as String?;
    final center = data['center'] is Map<String, Object?>
        ? data['center'] as Map<String, Object?>
        : null;
    final centerRecord = center == null
        ? null
        : await _findCenter(
            remoteId: '${center['id']}',
            centerCode: center['centerId'] as String?,
          );
    final existing = await _findTransferNote(
      remoteId: remoteId,
      mobileLocalId: mobileLocalId,
    );
    final localId = existing?.localId ?? mobileLocalId ?? _uuid.v4();
    final companion = TransferNotesCompanion(
      remoteId: Value(remoteId),
      transferNoteNo: Value('${data['transferNoteNo']}'),
      transferDate: Value(_parseDate(data['transferDate']) ?? DateTime.now()),
      centerLocalId: Value(
        centerRecord?.localId ?? existing?.centerLocalId ?? '',
      ),
      status: Value('${data['status'] ?? NoteStatus.active}'),
      canCount: Value((data['canCount'] as num?)?.toInt() ?? 0),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.transferNotes)
          .insert(
            companion.copyWith(
              localId: Value(localId),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else if (existing.syncStatus == SyncStatus.synced) {
      await (db.update(
        db.transferNotes,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }

    final items = (data['items'] as List? ?? const [])
        .whereType<Map<String, Object?>>();
    for (final item in items) {
      await _upsertTransferNoteItem(item, localId);
    }
  }

  Future<void> _upsertTransferNoteItem(
    Map<String, Object?> data,
    String transferNoteLocalId,
  ) async {
    final remoteId = '${data['id']}';
    final mobileLocalId = data['mobileLocalId'] as String?;
    final existing = await _findTransferNoteItem(
      remoteId: remoteId,
      mobileLocalId: mobileLocalId,
    );
    final companion = TransferNoteItemsCompanion(
      remoteId: Value(remoteId),
      transferNoteLocalId: Value(transferNoteLocalId),
      canCode: Value('${data['canCode']}'),
      syncStatus: const Value(SyncStatus.synced),
      updatedAt: Value(_parseDate(data['updatedAt']) ?? DateTime.now()),
      deletedAt: const Value(null),
    );

    if (existing == null) {
      await db
          .into(db.transferNoteItems)
          .insert(
            companion.copyWith(
              localId: Value(mobileLocalId ?? _uuid.v4()),
              createdAt: Value(_parseDate(data['createdAt']) ?? DateTime.now()),
            ),
          );
    } else if (existing.syncStatus == SyncStatus.synced) {
      await (db.update(
        db.transferNoteItems,
      )..where((tbl) => tbl.localId.equals(existing.localId))).write(companion);
    }
  }

  Future<CenterRecord?> _findCenter({
    String? remoteId,
    String? centerCode,
  }) async {
    if (remoteId != null && remoteId.isNotEmpty) {
      final match = await (db.select(
        db.centers,
      )..where((tbl) => tbl.remoteId.equals(remoteId))).getSingleOrNull();
      if (match != null) return match;
    }
    if (centerCode != null && centerCode.isNotEmpty) {
      return (db.select(
        db.centers,
      )..where((tbl) => tbl.centerCode.equals(centerCode))).getSingleOrNull();
    }
    return null;
  }

  Future<IssueNoteRecord?> _findIssueNote({
    String? remoteId,
    String? mobileLocalId,
  }) async {
    if (mobileLocalId != null && mobileLocalId.isNotEmpty) {
      final match = await (db.select(
        db.issueNotes,
      )..where((tbl) => tbl.localId.equals(mobileLocalId))).getSingleOrNull();
      if (match != null) return match;
    }
    return (db.select(
      db.issueNotes,
    )..where((tbl) => tbl.remoteId.equals(remoteId ?? ''))).getSingleOrNull();
  }

  Future<IssueNoteItemRecord?> _findIssueNoteItem({
    String? remoteId,
    String? mobileLocalId,
  }) async {
    if (mobileLocalId != null && mobileLocalId.isNotEmpty) {
      final match = await (db.select(
        db.issueNoteItems,
      )..where((tbl) => tbl.localId.equals(mobileLocalId))).getSingleOrNull();
      if (match != null) return match;
    }
    return (db.select(
      db.issueNoteItems,
    )..where((tbl) => tbl.remoteId.equals(remoteId ?? ''))).getSingleOrNull();
  }

  Future<TransferNoteRecord?> _findTransferNote({
    String? remoteId,
    String? mobileLocalId,
  }) async {
    if (mobileLocalId != null && mobileLocalId.isNotEmpty) {
      final match = await (db.select(
        db.transferNotes,
      )..where((tbl) => tbl.localId.equals(mobileLocalId))).getSingleOrNull();
      if (match != null) return match;
    }
    return (db.select(
      db.transferNotes,
    )..where((tbl) => tbl.remoteId.equals(remoteId ?? ''))).getSingleOrNull();
  }

  Future<TransferNoteItemRecord?> _findTransferNoteItem({
    String? remoteId,
    String? mobileLocalId,
  }) async {
    if (mobileLocalId != null && mobileLocalId.isNotEmpty) {
      final match = await (db.select(
        db.transferNoteItems,
      )..where((tbl) => tbl.localId.equals(mobileLocalId))).getSingleOrNull();
      if (match != null) return match;
    }
    return (db.select(
      db.transferNoteItems,
    )..where((tbl) => tbl.remoteId.equals(remoteId ?? ''))).getSingleOrNull();
  }

  DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    return DateTime.tryParse('$value');
  }
}

String prettyJson(Object value) =>
    const JsonEncoder.withIndent('  ').convert(value);
