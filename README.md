# KithulFlow Platform

KithulFlow is organized as a monorepo for the web admin app and the future mobile app.

## Structure

```text
apps/
  web/       # PERN administration portal
  mobile/    # Flutter offline-first field collector app
```

The existing full-stack web app lives in `apps/web`. The Flutter mobile app lives in `apps/mobile`.

## Root Commands

Run these from the repository root:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd test
npm.cmd run seed:local
```

Useful web-specific shortcuts still work from the root:

```powershell
npm.cmd run dev:server
npm.cmd run dev:client
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

Useful mobile shortcuts:

```powershell
npm.cmd run mobile:pub
npm.cmd run mobile:analyze
npm.cmd run mobile:build:android
npm.cmd run mobile:run
```

## Web App

See [apps/web/README.md](apps/web/README.md) for the web admin setup, database notes, seed scripts, and login details.

## Mobile App

See [apps/mobile/README.md](apps/mobile/README.md) for the Flutter offline-first field collector app.
