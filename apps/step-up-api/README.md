# @step-up/api

NestJS API for the classa dance studio product. Uses Prisma + PostgreSQL (Neon), Firebase Admin auth, and is deployable to Cloud Run.

## Setup

```bash
cd apps/step-up-api
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
# Optional: e2e-only studio (Playwright / HTTP). Does not replace admin seed.
# pnpm prisma:seed:e2e
# Optional: analytics-rich demo studio (Payments / Retention / funnel).
# pnpm prisma:seed:analytics
pnpm dev
```

## Auth

Production uses Firebase ID tokens via `Authorization: Bearer <token>`.

For local development, set `AUTH_BYPASS=true` and use mock tokens.

Admin seed (`prisma:seed`) creates only:

```
admin@stepup.dev / password
Authorization: Bearer dev:SYSTEM_ADMIN:system-admin-1
```

Create studios from `/admin`, or load demo/test data with `prisma:seed:e2e` (`studio-e2e-1`, `e2e-*` users — see `apps/step-up/e2e/fixtures/seed.ts`).

For Payments, Retention, student funnel, and batch revenue demos, run `prisma:seed:analytics` and sign in as `analytics-owner@stepup.dev` (`studio-analytics-1`).

## Encryption

At-rest envelope encryption (AES-256-GCM):

| Env var | Purpose |
|---------|---------|
| `CHAT_MASTER_KEY` | 64-char hex; wraps per-conversation chat keys |
| `PII_MASTER_KEY` | 64-char hex; wraps per-user keys for profile PII (email, name, phone, bio, instagramUrl) |

Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` / `pnpm dev:api` | API with hot reload |
| `pnpm dev:worker` | Worker (outbox + BullMQ processors); requires `REDIS_URL` |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod:api` | Run API production build |
| `pnpm start:prod:worker` | Run worker production build |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:seed` | Seed system admin only |
| `pnpm prisma:seed:e2e` | Seed isolated e2e test studio (`studio-e2e-1`) |
| `pnpm prisma:seed:smoke` | Seed isolated smoke studio (`studio-smoke-1`) |
| `pnpm prisma:seed:analytics` | Seed analytics demo studio (`studio-analytics-1`) |
| `pnpm test` | Run unit tests |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for CQRS, outbox, and layering rules.

## Docker

```bash
docker build -t step-up-api .
docker run -p 8080:8080 --env-file .env step-up-api
# Worker (same image, different command):
# docker run --env-file .env step-up-api node dist/worker.main.js
```

## Key endpoints

- `GET /health` — health check
- `POST /auth/sync` — create/update user from token
- `POST /jobs/daily` — enqueue daily jobs for the worker (requires `x-jobs-secret` header)
- Module routes under `/users`, `/studios`, `/batches`, `/plans`, `/subscriptions`, `/sessions`, `/attendance`, `/bookings`, `/billing`, `/notifications`, `/retention`, `/media`
