# Step Up testing

## Layers

1. **Vitest API/service** (`apps/step-up-api`) — domain rules, notifications, permissions
2. **Vitest Module/UI** (`apps/step-up`) — sticky widgets, hooks, route helpers
3. **Playwright E2E** (`apps/step-up/e2e`) — role shells and critical journeys

## Commands

```bash
# Layer 1
pnpm exec nx run step-up-api:test

# Layer 2
pnpm exec nx run step-up:test

# Layer 3 (requires Postgres seeded + AUTH_BYPASS)
pnpm exec nx run step-up:test:e2e
# or
pnpm test:step-up:e2e
```

## E2E prerequisites

- Postgres reachable via `DATABASE_URL`
- `AUTH_BYPASS=true` and `VITE_AUTH_BYPASS=true`
- Seed data: `pnpm --filter @step-up/api prisma:seed`
- API secrets used by seed/crypto (`PII_MASTER_KEY`, `CHAT_MASTER_KEY`, `SESSION_QR_SECRET`)

Playwright starts the API (`nest build && node dist/main.js`) and Vite app when servers are not already running.

Default E2E ports (avoids colliding with local `dev` on 3000/5180):

- API: `http://localhost:3199`
- Web: `http://localhost:5199`

Override with `STEP_UP_API_URL` / `STEP_UP_WEB_URL` (or `STEP_UP_API_PORT` / `STEP_UP_WEB_PORT`).

Auth setup writes Playwright `storageState` files under `e2e/.auth/` from seed users — no SPA login loop.

By default E2E **does not reuse** existing servers (a manually started Vite without `VITE_AUTH_BYPASS=true` breaks auth). To reuse:

```bash
STEP_UP_E2E_REUSE=true pnpm test:step-up:e2e
```
