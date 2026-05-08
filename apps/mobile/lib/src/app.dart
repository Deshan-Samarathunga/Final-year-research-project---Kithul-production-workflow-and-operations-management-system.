import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme.dart';
import 'data/providers.dart';
import 'features/auth/login_screen.dart';
import 'features/field_collection/issue_note_detail_screen.dart';
import 'features/field_collection/issue_notes_screen.dart';
import 'features/field_collection/sync_status_screen.dart';
import 'features/field_collection/transfer_note_detail_screen.dart';
import 'features/field_collection/transfer_notes_screen.dart';

class KithulFlowMobileApp extends ConsumerStatefulWidget {
  const KithulFlowMobileApp({super.key, this.initialLocation = '/login'});

  final String initialLocation;

  @override
  ConsumerState<KithulFlowMobileApp> createState() =>
      _KithulFlowMobileAppState();
}

class _KithulFlowMobileAppState extends ConsumerState<KithulFlowMobileApp> {
  String? _lastAutoSyncedToken;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);

    ref.listen(connectivityProvider, (_, next) {
      final connected =
          next.asData?.value.any((result) => result.name != 'none') ?? false;
      if (widget.initialLocation == '/login' &&
          connected &&
          ref.read(sessionProvider).asData?.value != null) {
        Future.microtask(() => ref.read(mobileSyncServiceProvider).syncNow());
      }
    });

    final activeSession = session.asData?.value;
    if (widget.initialLocation == '/login' &&
        activeSession != null &&
        _lastAutoSyncedToken != activeSession.token) {
      _lastAutoSyncedToken = activeSession.token;
      Future.microtask(() => ref.read(mobileSyncServiceProvider).syncNow());
    }

    final router = GoRouter(
      initialLocation: widget.initialLocation,
      redirect: (context, state) {
        if (session.isLoading) return null;
        final loggedIn = session.asData?.value != null;
        final onLogin = state.matchedLocation == '/login';
        if (!loggedIn && !onLogin) return '/login';
        if (loggedIn && onLogin) return '/field-collection';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/sync',
          builder: (context, state) => const SyncStatusScreen(),
        ),
        GoRoute(
          path: '/field-collection',
          builder: (context, state) => const IssueNotesScreen(),
          routes: [
            GoRoute(
              path: 'notes/:localId',
              builder: (context, state) => IssueNoteDetailScreen(
                noteLocalId: state.pathParameters['localId']!,
              ),
            ),
            GoRoute(
              path: 'transfers',
              builder: (context, state) => const TransferNotesScreen(),
              routes: [
                GoRoute(
                  path: ':localId',
                  builder: (context, state) => TransferNoteDetailScreen(
                    transferLocalId: state.pathParameters['localId']!,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );

    return MaterialApp.router(
      title: 'KithulFlow',
      debugShowCheckedModeBanner: false,
      theme: buildKithulTheme(),
      routerConfig: router,
    );
  }
}
