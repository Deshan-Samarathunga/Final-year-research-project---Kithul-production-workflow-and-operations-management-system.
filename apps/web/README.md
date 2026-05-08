# KithulFlow Web Admin App

Full-stack PERN administration portal for the KithulFlow operations screenshots.

## Stack

- Local PostgreSQL
- Express, Node.js, TypeScript, Prisma
- React, Vite, TypeScript, TanStack Query, Tailwind CSS
- HTTP-only JWT admin authentication

## Quick Start

Run these commands from PowerShell in the repository root. Use `npm.cmd` on Windows because PowerShell may block `npm.ps1`.

```powershell
npm.cmd install
Copy-Item apps\web\.env.example apps\web\server\.env
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Before running Prisma migrations, create the local PostgreSQL database and user:

```sql
CREATE USER kithulflow WITH PASSWORD 'kithulflow';
CREATE DATABASE kithulflow OWNER kithulflow;
GRANT ALL PRIVILEGES ON DATABASE kithulflow TO kithulflow;
```

If you are using pgAdmin, open **Tools > Query Tool** on the default `postgres` database and run the SQL above. If the user already exists, run this instead:

```sql
ALTER USER kithulflow WITH PASSWORD 'kithulflow';
CREATE DATABASE kithulflow OWNER kithulflow;
GRANT ALL PRIVILEGES ON DATABASE kithulflow TO kithulflow;
```

The backend and Prisma expect this connection string in `apps\web\server\.env`:

```env
DATABASE_URL="postgresql://kithulflow:kithulflow@localhost:5432/kithulflow?schema=public"
```

Open `http://localhost:5173`.

Seeded admin login:

- User ID: `admin`
- Password: `Admin@12345`

## Useful Scripts

```bash
npm.cmd run dev          # start API and Vite dev server
npm.cmd run build        # type-check and build server/client
npm.cmd run test         # run backend and frontend tests
npm.cmd run db:migrate   # apply Prisma migrations
npm.cmd run db:seed      # seed screenshot-style data
npm.cmd run seed:local   # seed local data through modular scripts
```

The scoped admin pages are Dashboard, Employees, Centers, System Cans, and Field Collection. Other sidebar modules are visual placeholders for the next phase.

## Database Reference Files

The `apps/web/db/` folder contains SQL reference files for the full schema, module-level schema slices, migration snapshots, and verification queries. Prisma remains the normal migration runner under `apps/web/server/prisma`.

## Local Seed Scripts

The `apps/web/server/scripts/local/` folder contains smaller seed scripts for loading only the data group you need:

```powershell
npm.cmd run seed:admin
npm.cmd run seed:employees
npm.cmd run seed:centers
npm.cmd run seed:cans
npm.cmd run seed:issue-notes
npm.cmd run seed:local
```

If seed scripts fail with `permission denied for table ...`, run `apps/web/db/permissions/grant_kithulflow_app_user.sql` in pgAdmin while connected to the `kithulflow` database as `postgres`, then run the seed command again.
