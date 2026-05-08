# KithulFlow Mobile

Flutter offline-first mobile app for KithulFlow field collectors.

## Current Scope

- Field Collector role only
- Farmer role reserved for a later phase
- Issue notes with Active and Completed tabs
- Create issue notes for Sap or Treacle
- Add can IDs and quantities to active notes
- Submit, view, and reopen notes
- Transfer notes for empty cans
- Local SQLite storage with a sync outbox prepared for future backend sync

## Run On Windows

From the repository root:

```powershell
npm.cmd run mobile:pub
npm.cmd run mobile:analyze
npm.cmd run mobile:build:android
npm.cmd run mobile:run
```

Or from this folder:

```powershell
flutter pub get
flutter analyze
flutter build apk --debug
flutter run
```

## Notes

- Local data is stored on the device in `kithulflow_mobile.sqlite`.
- The app seeds screenshot-style demo centers, issue notes, and system cans on first launch.
- Sync APIs are intentionally stubbed for this version; all field work saves offline first.
- `flutter test` currently hits a Flutter 3.41 Windows native-assets crash with `sqlite3.dll`. Android debug builds are verified.
