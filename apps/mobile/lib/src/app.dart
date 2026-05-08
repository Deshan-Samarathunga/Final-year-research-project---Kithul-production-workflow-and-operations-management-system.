import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/field_collection/issue_note_detail_screen.dart';
import 'features/field_collection/issue_notes_screen.dart';
import 'features/field_collection/transfer_note_detail_screen.dart';
import 'features/field_collection/transfer_notes_screen.dart';

class KithulFlowMobileApp extends ConsumerWidget {
  const KithulFlowMobileApp({super.key, this.initialLocation = '/login'});

  final String initialLocation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = GoRouter(
      initialLocation: initialLocation,
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
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
