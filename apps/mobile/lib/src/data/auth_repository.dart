import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'app_database.dart';

class MobileSession {
  const MobileSession({
    required this.token,
    required this.serverUrl,
    required this.userId,
    required this.displayName,
  });

  final String token;
  final String serverUrl;
  final String userId;
  final String displayName;
}

class AuthRepository {
  AuthRepository(this.db, {FlutterSecureStorage? secureStorage, Dio? dio})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _dio = dio ?? Dio();

  final AppDatabase db;
  final FlutterSecureStorage _secureStorage;
  final Dio _dio;

  static const _tokenKey = 'kithulflow_mobile_token';
  static const _userIdKey = 'kithulflow_mobile_user_id';
  static const _displayNameKey = 'kithulflow_mobile_display_name';
  static const serverUrlKey = 'serverUrl';
  static const lastSyncAtKey = 'lastSyncAt';
  static const lastSyncErrorKey = 'lastSyncError';

  Future<MobileSession?> getSession() async {
    final token = await _secureStorage.read(key: _tokenKey);
    final userId = await _secureStorage.read(key: _userIdKey);
    final displayName = await _secureStorage.read(key: _displayNameKey);
    final serverUrl = await getServerUrl();

    if (token == null || userId == null || displayName == null || serverUrl == null) {
      return null;
    }

    return MobileSession(token: token, serverUrl: serverUrl, userId: userId, displayName: displayName);
  }

  Future<MobileSession> login({
    required String serverUrl,
    required String userId,
    required String password,
  }) async {
    final normalizedUrl = normalizeServerUrl(serverUrl);
    final response = await _dio.post<Map<String, Object?>>(
      '$normalizedUrl/api/mobile/auth/login',
      data: {'userId': userId.trim(), 'password': password},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    final body = response.data ?? {};
    final token = body['token'] as String?;
    final user = body['user'] as Map<String, Object?>?;

    if (token == null || user == null) {
      throw Exception('Invalid mobile login response');
    }

    final displayName = (user['displayName'] ?? userId).toString();
    await setServerUrl(normalizedUrl);
    await _secureStorage.write(key: _tokenKey, value: token);
    await _secureStorage.write(key: _userIdKey, value: userId.trim());
    await _secureStorage.write(key: _displayNameKey, value: displayName);

    return MobileSession(token: token, serverUrl: normalizedUrl, userId: userId.trim(), displayName: displayName);
  }

  Future<void> logout() async {
    final session = await getSession();
    if (session != null) {
      try {
        await _dio.post<void>(
          '${session.serverUrl}/api/mobile/auth/logout',
          options: Options(headers: {'Authorization': 'Bearer ${session.token}'}),
        );
      } catch (_) {
        // Logout must work offline; local credentials are cleared regardless.
      }
    }

    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userIdKey);
    await _secureStorage.delete(key: _displayNameKey);
  }

  Future<String?> getServerUrl() => getMetadata(serverUrlKey);

  Future<void> setServerUrl(String serverUrl) => setMetadata(serverUrlKey, normalizeServerUrl(serverUrl));

  Future<String?> getMetadata(String key) async {
    final row = await (db.select(db.syncMetadata)..where((tbl) => tbl.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  Future<void> setMetadata(String key, String value) async {
    await db.into(db.syncMetadata).insertOnConflictUpdate(
          SyncMetadataCompanion.insert(
            key: key,
            value: value,
            updatedAt: Value(DateTime.now()),
          ),
        );
  }

  String normalizeServerUrl(String serverUrl) {
    final trimmed = serverUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return 'http://$trimmed';
  }
}
