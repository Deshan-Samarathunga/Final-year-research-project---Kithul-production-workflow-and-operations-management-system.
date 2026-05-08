# Local Seed Scripts

These scripts seed only the local development database configured by `server/.env`.

Use these when you want to load one group of data without running the full Prisma seed.

## Commands

Run from the repository root:

```powershell
npm.cmd run seed:admin --workspace server
npm.cmd run seed:employees --workspace server
npm.cmd run seed:centers --workspace server
npm.cmd run seed:cans --workspace server
npm.cmd run seed:issue-notes --workspace server
npm.cmd run seed:local --workspace server
```

Or use the root shortcuts:

```powershell
npm.cmd run seed:admin
npm.cmd run seed:employees
npm.cmd run seed:centers
npm.cmd run seed:cans
npm.cmd run seed:issue-notes
npm.cmd run seed:local
```

## Seeded Login

- User ID: `admin`
- Password: `Admin@12345`

Employee test passwords are seeded as `password123`.

## Notes

- Scripts use `upsert`, so they are safe to run again.
- `seed:issue-notes` expects centers to exist first.
- `seed:local` runs admin, employees, centers, cans, and issue notes in order.
