# Step Up testing

Strategy: finalized product flows are the contract. Each flow gets the lightest reliable layer.

```
Finalized Product Flows
          |
          ├── Critical User Journeys → Playwright E2E (@critical)
          ├── Business Rules         → API / service Vitest
          ├── UI Behavior            → Module / UI Vitest
          └── Edge Cases             → Unit Vitest
```

Source of truth for coverage: [`FLOW_COVERAGE_MATRIX.md`](./FLOW_COVERAGE_MATRIX.md).

## Layers

1. **Vitest API/service** (`apps/step-up-api`) — domain rules, notifications, permissions
2. **Vitest Module/UI** (`apps/step-up`) — widgets, hooks, route helpers
3. **Playwright E2E** (`apps/step-up/e2e`) — role shells and critical journeys
4. **Migration smoke** (`apps/step-up-api/scripts/test-migrations.ts`) — empty DB → migrate → assert

## Commands

```bash
# Layer 1 — API / service
pnpm exec nx run step-up-api:test

# Layer 2 — Module / UI
pnpm exec nx run step-up:test

# Layer 3 — full Playwright
pnpm exec nx run step-up:test:e2e
# or
pnpm test:step-up:e2e

# Critical journeys only (PR regression)
pnpm test:step-up:e2e:critical

# PR regression bundle (API + UI + critical E2E)
pnpm test:step-up:regression

# Migration smoke (dedicated Postgres DB; drops public schema)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/step_up_migrate?schema=public \
  pnpm exec nx run step-up-api:test:migrations

# Migration smoke + second empty-schema re-apply
DATABASE_URL=... pnpm --filter @step-up/api test:migrations -- --upgrade
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

Tag critical journeys with `@critical` in the test title so PR regression stays fast.

## CI gates

| Gate | Workflow | Scope | Target |
| --- | --- | --- | --- |
| PR regression | `ci.yml` → `step-up-regression` | API Vitest + UI Vitest + Playwright `@critical` + migration smoke | &lt; 15 min |
| Merge queue | `ci.yml` → `step-up-e2e` | Full Playwright + migration + seed | &lt; 45 min |
| Nightly | `step-up-nightly.yml` | All Vitest + full Playwright matrix (Chromium, Firefox, WebKit, mobile) | Artifacts retained |

## Definition of Done

A Step Up feature is complete only when:

```
Feature implemented
  + API tests for business rules
  + UI tests when module behavior changed
  + Critical flow updated in FLOW_COVERAGE_MATRIX.md
  + Permission cases covered
  + Migration smoke green if schema changed
```

## Targets (north star)

| Layer | Target |
| --- | --- |
| Playwright critical journeys | 20–30 |
| API / service Vitest | 300–500 |
| UI module Vitest | 100–200 |
| Unit helpers | many small |
