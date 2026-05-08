# KithulFlow Platform

KithulFlow is organized as a monorepo for the web admin app and the future mobile app.

## Structure

```text
apps/
  web/       # PERN administration portal
  mobile/    # empty placeholder for the mobile app
```

The existing full-stack web app now lives in `apps/web`.

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

## Web App

See [apps/web/README.md](apps/web/README.md) for the web admin setup, database notes, seed scripts, and login details.

## Mobile App

`apps/mobile` is intentionally empty for now. It is reserved for the future mobile app.
