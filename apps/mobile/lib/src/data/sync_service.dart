import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

import 'app_database.dart';

class MobileSyncService {
  MobileSyncService({Dio? dio, Connectivity? connectivity})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: 'http://localhost:4000/api/mobile')),
        _connectivity = connectivity ?? Connectivity();

  final Dio _dio;
  final Connectivity _connectivity;

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return results.any((result) => result != ConnectivityResult.none);
  }

  Future<void> pushPendingChanges(AppDatabase db) async {
    if (!await isOnline) return;

    // The mobile app is offline-first in v1. This method keeps the API seam ready
    // for the future PERN sync endpoint without changing local workflows.
    if (_dio.options.baseUrl.isEmpty) return;
  }

  Future<void> pullReferenceData(AppDatabase db) async {
    if (!await isOnline) return;

    // Future target: GET /api/mobile/bootstrap for centers and system cans.
    if (_dio.options.baseUrl.isEmpty) return;
  }
}
