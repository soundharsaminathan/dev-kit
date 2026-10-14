# Loan-mate API

NestJS + Prisma LMS backend for staff-only multi-company NBFC loan management.

## Quick start

### 1. Local Postgres

PostgreSQL 16 on `127.0.0.1:5432` with database `loan_mate`:

```bash
# If Postgres is not installed yet (Windows):
winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements

# Create DB (password default: postgres)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE loan_mate;"
```

Copy env (local defaults already in `.env.example`):

```bash
cd apps/loan-mate-api
cp .env.example .env   # or keep the generated local .env
pnpm install           # from monorepo root
pnpm prisma:generate
pnpm exec prisma migrate deploy
pnpm prisma:seed
pnpm dev               # http://localhost:3010
```

Health: `GET /health`

Auth bypass (dev): `Authorization: Bearer dev:ROLE:userId` when `AUTH_BYPASS=true`.

Login: `POST /auth/login` with seed emails (`owner@loan-mate.local` / `password`, etc.).

| Role | Email | Password |
|---|---|---|
| System Admin | `admin@loan-mate.local` | `password` |
| Company Owner | `owner@loan-mate.local` | `password` |
| Company Admin | `admin.company@loan-mate.local` | `password` |
| Branch Manager | `branch@loan-mate.local` | `password` |
| Loan Officer | `officer@loan-mate.local` | `password` |
| Approver | `approver@loan-mate.local` | `password` |
| Collection Officer | `collections@loan-mate.local` | `password` |

Production: Cloud Run `loan-mate-api` in GCP `step-up10` / `asia-south1`, same WIF as classa. GitHub secrets `LOAN_MATE_DATABASE_URL` and `LOAN_MATE_DIRECT_DATABASE_URL` are written to Secret Manager on each deploy. See `apps/loan-mate/README.md`.

Worker (overdue + penalty once):

```bash
pnpm exec nest start --entryFile worker.main
```

## Scripts

| Script | Purpose |
|---|---|
| `dev` | API watch mode |
| `build` | Nest compile |
| `prisma:generate` | Generate client into `src/generated/prisma` |
| `prisma:seed` | Seed acme demo data |
| `test` | Vitest (EMI / allocation / penalty / roles) |
