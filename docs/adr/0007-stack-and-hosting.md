# Next.js + PostgreSQL/Drizzle, hosted on our Easypanel server

We use Next.js as the full-stack framework and PostgreSQL with Drizzle as the database layer. We picked Drizzle over Prisma because it stays close to SQL, which makes explicit transactions, `numeric` columns and database constraints easy to control. Money is stored as `numeric(18,2)` and handled with a decimal library, never floats. The business time zone is `Asia/Makassar` (WITA): dates such as Accounting Periods and Payroll Run months are computed in that zone.

The app runs on our existing Easypanel server as native services: an App service built from this repo's Dockerfile, and an Easypanel Postgres service. Easypanel's proxy handles domains and HTTPS. Easypanel has no pre-deploy hook, so migrations run at app startup, before the server accepts requests. A failed migration stops the new container from starting.

Database backups use Easypanel's built-in scheduled backups to Google Drive. We accepted that these files are not encrypted by us, in exchange for simple setup and restore from the Easypanel UI. The backups contain salary data and NIK, so the Google account that owns the Drive must have 2FA and must not be shared.

## Considered Options

- **Docker Compose + Caddy on a bare VPS**: built first, replaced once we learned the server already runs Easypanel.
- **Our own backup container** (`age` encryption + rclone to Google Drive): encrypted at rest, rejected for its extra setup and its script-only restore.
