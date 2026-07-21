# @step-up/api

NestJS API for the Step Up dance studio product. Uses Prisma + PostgreSQL (Neon), Firebase Admin auth, and is deployable to Cloud Run.

## Setup

```bash
cd apps/step-up-api
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Auth

Production uses Firebase ID tokens via `Authorization: Bearer <token>`.

For local development, set `AUTH_BYPASS=true` and use mock tokens:

```
Authorization: Bearer dev:OWNER:owner-1
Authorization: Bearer dev:STAFF:staff-1
Authorization: Bearer dev:TRAINER:trainer-1
Authorization: Bearer dev:STUDENT:student-1
Authorization: Bearer dev:PARENT:parent-1
```

Seed data creates users matching these tokens.

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
| `pnpm dev` | Start with hot reload |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run production build |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:seed` | Seed dev users |
| `pnpm test` | Run unit tests |

## Docker

```bash
docker build -t step-up-api .
docker run -p 8080:8080 --env-file .env step-up-api
```

## Key endpoints

- `GET /health` — health check
- `POST /auth/sync` — create/update user from token
- `POST /jobs/daily` — cron job (requires `x-jobs-secret` header)
- Module routes under `/users`, `/studios`, `/batches`, `/plans`, `/subscriptions`, `/sessions`, `/attendance`, `/bookings`, `/billing`, `/notifications`, `/retention`, `/media`
