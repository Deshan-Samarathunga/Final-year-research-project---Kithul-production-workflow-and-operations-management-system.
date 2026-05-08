# Database Folder

This folder is the SQL reference area for KithulFlow database work.

Prisma remains the app migration runner in `server/prisma`, but this folder keeps readable SQL files for planning, review, verification, and future hand-written migration notes.

## Structure

- `full_schema.sql` - full current PostgreSQL schema for the app.
- `admin_schema.sql` - admin and employee login/management tables.
- `field_collection_schema.sql` - collection centers and issue notes.
- `inventory_schema.sql` - reusable system cans and can history.
- `migrations/` - migration SQL snapshots, mirrored from Prisma migrations when applicable.
- `merged_migrations/` - merged full migration files for database review or manual rebuilds.
- `permissions/` - one-time local database permission fixes.
- `verification/` - SQL checks to confirm tables, indexes, and foreign keys exist.

## Local Development Flow

Use Prisma for normal development:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

When the schema changes, update both:

1. `server/prisma/schema.prisma`
2. the matching SQL reference files in this `db/` folder

Keep `db/full_schema.sql` aligned with the latest expected database shape.
