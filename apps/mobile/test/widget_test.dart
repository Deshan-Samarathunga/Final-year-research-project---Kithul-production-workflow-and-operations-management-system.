import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kithulflow_mobile/src/app.dart';
import 'package:kithulflow_mobile/src/data/app_database.dart';
import 'package:kithulflow_mobile/src/data/auth_repository.dart';
import 'package:kithulflow_mobile/src/data/providers.dart';

Future<AppDatabase> pumpFieldCollectorApp(
  WidgetTester tester, {
  String initialLocation = '/field-collection',
}) async {
  final database = AppDatabase(NativeDatabase.memory());
  addTearDown(database.close);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        databaseProvider.overrideWithValue(database),
        sessionProvider.overrideWith(
          (ref) async => const MobileSession(
            token: 'test-token',
            serverUrl: 'http://127.0.0.1:4000',
            userId: 'field01',
            displayName: 'Field Collector',
          ),
        ),
      ],
      child: KithulFlowMobileApp(initialLocation: initialLocation),
    ),
  );
  await tester.pumpAndSettle();
  return database;
}

void main() {
  testWidgets('renders active and completed issue note tabs', (tester) async {
    await pumpFieldCollectorApp(tester);

    expect(find.textContaining('Active'), findsWidgets);
    expect(find.textContaining('Completed'), findsWidgets);

    await tester.tap(find.textContaining('Completed').first);
    await tester.pumpAndSettle();

    expect(find.text('ISN/AK/04/05'), findsOneWidget);
  });

  testWidgets('validates create issue note form', (tester) async {
    await pumpFieldCollectorApp(tester);

    await tester.tap(find.text('New issue note').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Create issue note'));
    await tester.pump();

    expect(find.text('Enter issue note name'), findsOneWidget);
  });

  testWidgets('validates can quantity before adding to issue note', (
    tester,
  ) async {
    await pumpFieldCollectorApp(tester);

    await tester.tap(find.text('Continue').first);
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'AR050');
    await tester.enterText(find.byType(TextFormField).at(1), '0');
    await tester.tap(find.text('Add'));
    await tester.pump();

    expect(find.text('Quantity must be more than 0'), findsOneWidget);
  });

  testWidgets('requires pH and Brix before adding to issue note', (
    tester,
  ) async {
    await pumpFieldCollectorApp(tester);

    await tester.tap(find.text('Continue').first);
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'AR001');
    await tester.enterText(find.byType(TextFormField).at(1), '12.5');
    await tester.tap(find.text('Add'));
    await tester.pump();

    expect(find.text('Enter pH value'), findsOneWidget);
    expect(find.text('Enter Brix'), findsOneWidget);
  });

  testWidgets('can submit then reopen an issue note', (tester) async {
    await pumpFieldCollectorApp(tester);

    await tester.tap(find.text('Submit').first);
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Completed').first);
    await tester.pumpAndSettle();

    expect(find.text('fgdgdgfdg'), findsOneWidget);

    await tester.tap(find.text('Reopen').first);
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Active').first);
    await tester.pumpAndSettle();

    expect(find.text('fgdgdgfdg'), findsOneWidget);
  });

  testWidgets('creates a transfer note locally', (tester) async {
    await pumpFieldCollectorApp(
      tester,
      initialLocation: '/field-collection/transfers',
    );

    await tester.tap(find.text('New transfer'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, 'TFN/LOCAL/01');

    await tester.tap(find.byType(DropdownButtonFormField<String>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Ajith').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create transfer note'));
    await tester.pumpAndSettle();

    expect(find.text('TFN/LOCAL/01'), findsOneWidget);
    expect(find.text('Add empty can'), findsOneWidget);
  });
}
