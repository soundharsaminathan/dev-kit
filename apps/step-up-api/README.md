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
soundhar.adi+admin@gmail.com / password
Authorization: Bearer dev:SYSTEM_ADMIN:system-admin-1
```

Create studios from `/admin`, or load demo/test data with `prisma:seed:e2e` (`studio-e2e-1`, `e2e-*` users — see `apps/step-up/e2e/fixtures/seed.ts`).

For Payments, Retention, student funnel, and batch revenue demos, run `prisma:seed:analytics` and sign in as `soundhar.adi+analytics-owner@gmail.com` (`studio-analytics-1`).

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
| `pnpm devtool:create-month-invoices` | Catch up this month's prepaid invoices (`[--dry-run]`, optional studio id). Prod: `ALLOW_PROD_DB=1` |
| `pnpm test` | Run unit tests |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for CQRS, outbox, and layering rules.

## Docker

```bash
docker build -t step-up-api .
docker run -p 8080:8080 --env-file .env step-up-api
# Worker (same image, different command; requires REDIS_URL):
docker run --env-file .env -p 8080:8080 step-up-api node dist/worker.main.js
```

## Cloud Run worker

The API image already includes `dist/worker.main.js`. Production must run a **second** service with that command — the HTTP API (`OUTBOX_INLINE=true`) does not process BullMQ or the 06:00 UTC membership roll.

CI deploys `step-up-worker` next to `step-up-api` (same image). To bring it up immediately from an already-deployed API revision:

```bash
REGION="$(gcloud run services describe step-up-api --format='value(metadata.labels.cloud.googleapis.com/location)')"
IMAGE="$(gcloud run services describe step-up-api --region "$REGION" --format='value(spec.template.spec.containers[0].image)')"

gcloud run deploy step-up-worker \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 1 \
  --cpu 1 \
  --memory 1Gi \
  --cpu-boost \
  --no-cpu-throttling \
  --port 8080 \
  --command=node \
  --args=dist/worker.main.js \
  --network default \
  --subnet default \
  --vpc-egress private-ranges-only
```

Then copy env/secrets from `step-up-api` (at least `DATABASE_URL`, `REDIS_URL`, `PII_MASTER_KEY`, SMTP, Sentry). Do **not** set `OUTBOX_INLINE=true` on the worker.

`--min-instances 1` and `--no-cpu-throttling` are required: Cloud Run otherwise freezes the process between HTTP requests, so the daily invoice job never runs. On boot the worker also enqueues one catch-up `runDaily` (idempotent), then repeats at 06:00 UTC.

## Key endpoints

- `GET /health` — health check
- `POST /auth/sync` — create/update user from token
- `POST /jobs/daily` — enqueue daily jobs for the worker (requires `x-jobs-secret` header)
- `GET /billing/pay/:invoiceId` — public 302 to Razorpay Payment Link (or in-app checkout fallback)
- `POST /billing/webhooks/razorpay` — Razorpay `payment_link.paid` webhook (raw body + `X-Razorpay-Signature`)
- Module routes under `/users`, `/studios`, `/batches`, `/plans`, `/subscriptions`, `/sessions`, `/attendance`, `/bookings`, `/billing`, `/notifications`, `/retention`, `/media`

## WhatsApp invoice reminders + Payment Links

When a student invoice is created (enroll, renewal, family combine — not data import), the outbox:

1. Creates a Razorpay **Payment Link** (studio keys, else `RAZORPAY_KEY_*`) and stores `razorpayPaymentLinkId` / `razorpayPaymentLinkUrl`
2. Sends a Meta Cloud API **template** from the platform WhatsApp number (`WHATSAPP_*`)

Approved template (`invoice_created` / `en`):

- Body: `Hi {{1}}, {{3}} created an invoice for Rs {{2}}. Tap Pay to complete payment.`
- URL button: `{API_PUBLIC_URL or APP_URL}/billing/pay/{{1}}` (dynamic suffix = invoice id)

`GET /billing/pay/:invoiceId` redirects to the Razorpay short URL, or to `{APP_URL}/me/checkout/invoice/:id` when no link exists.

Configure Razorpay Dashboard webhooks to `POST /billing/webhooks/razorpay` for `payment_link.paid`, using `RAZORPAY_WEBHOOK_SECRET` (or a per-studio encrypted webhook secret). Local/CI without WhatsApp/Razorpay credentials stay silent: invoices still create; sends and links are skipped.
