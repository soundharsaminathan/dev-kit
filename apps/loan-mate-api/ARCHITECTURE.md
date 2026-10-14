# Loan-mate API architecture

Lean NestJS API patterned after classa (`step-up-api`) without Firebase, Redis, Razorpay, or Socket.IO.

## Layers

- **HTTP modules** — thin controllers + services; `@Roles` + `AuthGuard` / `RolesGuard`
- **Prisma** — PostgreSQL; client generated to `src/generated/prisma`
- **Domain** — pure functions under `src/schedules/domain/` (EMI, allocation, penalty, foreclosure) with Vitest coverage
- **Audit** — append-only `AuditLog` via `AuditService.append`; read API for company-scoped viewer + CSV
- **Approvals** — single-level maker-checker; maker cannot decide own request; **approve applies payload** (Q41)
- **Accounting** — double-entry journals; CoA cloned per company from system template
- **Documents** — R2 object keys on `Document` records (presigned upload/download)
- **Notifications** — `OutboxEvent` consumer → in-app inbox + email
- **Worker** — `worker.main.ts` runs overdue/penalty and outbox processing

## Tenancy

- `Company` → `Branch` → branch-scoped staff
- Owner/Admin: all branches in company; list endpoints filter by branch for branch roles
- Sequences: global `CUST`, per-company `LN:{companyId}`, per-company `RCPT:{companyId}`

## Loan lifecycle

`DRAFT → SUBMITTED → VERIFIED → APPROVED|REJECTED → DISBURSED → ACTIVE → CLOSED|WRITTEN_OFF`

- Closure: `CLOSED` with `closureType` FORECLOSED | SETTLED | NORMAL
- Write-off: `WRITTEN_OFF` (recovery payments still allowed)
- Schedule generated at disbursement (Actual/365 reducing equated EMI)

## Payments

Penalty → Interest → Principal, oldest installment first. Overpayment rejected unless `advanceTreatment` is set. Reversals and waivers require maker-checker (approve applies).

## NPA

Manual customer-level flag; blocks origination; overdue job never sets NPA.

## Auth

- `AUTH_BYPASS=true`: `Bearer dev:ROLE:userId` or email/password login returning that token
- Optional stub: `Bearer user:<id>` after password login when bypass is off (no Firebase)
