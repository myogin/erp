# ERP

Centralised accounting and payroll for our three CVs, replacing Accurate and gaji.id. Start with `GLOSSARY.md` and `docs/adr/`; the phase 1 plan is issue #1.

## Development

Requires Node 24+ and Docker.

```sh
cp .env.example .env
npm install
npm run db:up        # local PostgreSQL on :5432
npm run db:migrate
npm run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm test` | Vitest against a real PostgreSQL test database, recreated each run |
| `npm run typecheck` | Next.js route types + `tsc` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |

## Deploy (Easypanel)

The app runs on our Easypanel server as two services in one project (ADR-0007).

One-time setup:

1. **Postgres service**: create one (e.g. `erp-db`). Copy its internal connection URL from the Credentials tab.
2. **App service** (e.g. `erp`):
   - Source: GitHub `myogin/erp`, branch `main`, build path `/`.
   - Build: **Dockerfile** (`Dockerfile`).
   - Environment: `DATABASE_URL=<internal connection URL from step 1>`.
   - Domains: your domain → port `3000`, HTTPS on.
3. **Backups**: add Google Drive under Settings → Server → Storage Providers, then on the Postgres service add a daily backup (e.g. `0 2 * * *`) to a dedicated path such as `/erp-backups/erp-db`, with a retention count. Run one backup now and test a restore into a scratch database before relying on it.

Deploy or update: push to `main`, then **Deploy** in Easypanel (or enable auto-deploy). Pending migrations are applied when the new container starts; if one fails, the container won't start, so check its logs. Check `https://<domain>/api/health`.

Backups go to Google Drive unencrypted and contain salary data and NIK. Keep 2FA on the Google account that owns the Drive, and don't share the folder.
