# KithulFlow PERN Admin Panel

Full-stack PERN administration portal for the KithulFlow operations screenshots.

## Stack

- Local PostgreSQL
- Express, Node.js, TypeScript, Prisma
- React, Vite, TypeScript, TanStack Query, Tailwind CSS
- HTTP-only JWT admin authentication

## Quick Start

Run these commands from PowerShell in the project root. Use `npm.cmd` on Windows because PowerShell may block `npm.ps1`.

```powershell
npm.cmd install
Copy-Item .env.example .env
Copy-Item .env.example server\.env
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

The backend and Prisma expect this connection string in `server\.env`:

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
```

The scoped admin pages are Dashboard, Employees, Centers, System Cans, and Field Collection. Other sidebar modules are visual placeholders for the next phase.
