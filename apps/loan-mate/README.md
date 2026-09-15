# loan-mate

Staff-only NBFC loan management SPA (Vite + React 19 + TanStack Router/Query).

## Prerequisites

- Node ≥ 24, pnpm ≥ 11
- API: `loan-mate-api` on port **3010** (`pnpm dev:loan-mate-api`)

## Run

From the monorepo root:

```bash
pnpm install
pnpm dev:loan-mate
```

App: [http://localhost:5181](http://localhost:5181)

Optional env (defaults are fine for local):

| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:3010` |
| `VITE_AUTH_BYPASS` | `true` in development when unset |

## Auth bypass / seed logins

With `VITE_AUTH_BYPASS=true`, the login page shows quick-login buttons. Seed password for all:

```
password
```

| Role | Email |
|---|---|
| System Admin | `admin@loan-mate.local` |
| Company Owner | `owner@loan-mate.local` |
| Company Admin | `admin.company@loan-mate.local` |
| Branch Manager | `branch@loan-mate.local` |
| Loan Officer | `officer@loan-mate.local` |
| Approver | `approver@loan-mate.local` |
| Collection Officer | `collections@loan-mate.local` |

`SYSTEM_ADMIN` lands on `/admin`; other staff on `/app`. Session is stored in `localStorage` under `loan-mate-session`.

## Production deploy

GitHub Actions (`.github/workflows/loan-mate-deploy.yml`) on `loan-mate` / `main`: Cloudflare Pages for the SPA, Cloud Run `loan-mate-api` in GCP project `step-up10` / `asia-south1` (same as classa). GitHub secrets are upserted into Secret Manager on each deploy.

Create a Neon database `loan_mate`, then set the GitHub vars/secrets listed in that workflow. Dummy placeholders:

| Kind | Name | Dummy |
|---|---|---|
| var | `LOAN_MATE_WEB_URL` | `https://loan-mate.pages.dev` |
| var | `LOAN_MATE_API_URL` | `https://loan-mate-api-2qwqkvvlza-el.a.run.app` |
| secret | `LOAN_MATE_DATABASE_URL` | Neon pooled URI (must not contain `CHANGE_ME`) |
| secret | `LOAN_MATE_DIRECT_DATABASE_URL` | Neon direct URI |

Reuse existing classa `GCP_*` and `CLOUDFLARE_*` credentials. After the first migrate, seed once against Neon:

```bash
pnpm --filter @loan-mate/api prisma:seed
```

## Scripts

```bash
pnpm nx run loan-mate:dev
pnpm nx run loan-mate:typecheck
pnpm nx run loan-mate:build
pnpm nx run loan-mate:test
```

## Routes

- `/login` — email/password (+ bypass quick login)
- `/admin` — create/list companies
- `/app` — dashboard, customers, products, loans, approvals, collections, settings, profile
