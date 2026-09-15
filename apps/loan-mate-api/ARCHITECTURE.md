# Loan-mate API architecture

Lean NestJS API patterned after classa (`step-up-api`) without Firebase, Redis, Razorpay, or Socket.IO for v1.

## Layers

- **HTTP modules** — thin controllers + services; `@Roles` + `AuthGuard` / `RolesGuard`
- **Prisma** — PostgreSQL; client generated to `src/generated/prisma` (custom output so it does not clash with step-up's `@prisma/client`)
- **Domain** — pure functions under `src/schedules/domain/` (EMI, allocation, penalty) with golden Vitest coverage
- **Audit** — append-only `AuditLog` via `AuditService.append`
- **Approvals** — single-level maker-checker; maker cannot decide own request
- **Worker** — `worker.main.ts` runs `OverdueJobsService` once (or `--loop`)

## Tenancy

- `Company` → `Branch` → branch-scoped staff
- Owner/Admin: all branches in company
- Sequences: global `CUST`, per-company `LN:{companyId}`, per-company `RCPT:{companyId}`

## Loan lifecycle

`DRAFT → SUBMITTED → VERIFIED → APPROVED|REJECTED → (disburse) ACTIVE → CLOSED`

Schedule generated at disbursement (Actual/365 reducing equated EMI).

## Payments

Penalty → Interest → Principal, oldest installment first. Overpayment rejected unless `advanceTreatment` is set. Reversals and penalty waivers require approved maker-checker requests.

## Auth

- `AUTH_BYPASS=true`: `Bearer dev:ROLE:userId` or email/password login returning that token
- Optional stub: `Bearer user:<id>` after password login when bypass is off (no Firebase in v1)
