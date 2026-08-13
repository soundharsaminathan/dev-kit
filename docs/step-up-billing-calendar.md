# Step Up billing calendar

How monthly invoices are created after a student joins a batch.

The app is **not in production**. There is no backfill of old invoices. Schema adds nullable/default columns only. Tests delete leftover rows as needed and **create new invoices** for the case they cover.

## Main rule

After the first partial month, every invoice is a **1st-of-month prepaid** invoice.

| Field | Prepaid (normal) | First-month usage (mid-month joiner only) |
| --- | --- | --- |
| When created | At enroll (if prepaid-at-join) or at month-end for the **next** period | At month-end for the month they just finished |
| `periodStart` | 1st of the covered month | 1st of the month they joined |
| Due date | **1st** (`periodStart`) | **Last day** (`periodEnd`) |
| Amount | Full plan price | `(PRESENT / scheduled regular sessions that month) × plan price` |
| `chargeType` | `PREPAID_FULL` | `POSTPAID_PRORATED` |

Enrollment is always immediate. Billing never delays the roster seat.

## Prepaid now vs postpaid first month

**Prepaid now** — create a full-price invoice at enroll/checkout — if **any** of these is true:

1. Join UTC date is the **1st**, or
2. This batch has **no** regular non-cancelled session this month, or
3. They join **at or before** this batch’s first regular session this month

**Postpaid first month** — no invoice at join — if they join **after** that first session has already started.

- `Membership.billingPhase = FIRST_POSTPAID`
- They are **not** `monthlyUnpaid` until an open invoice exists
- After `periodEnd`, the daily job (06:00 UTC on the 1st) creates:
  1. **Usage invoice** (`POSTPAID_PRORATED`) if amount &gt; 0
  2. **Next-period prepaid** (`PREPAID_FULL`, due the 1st) if they are still enrolled
- 0 sessions attended → skip usage invoice; still create next prepaid if enrolled
- Then `billingPhase` on the next membership is `PREPAID`

Example: join 15 Aug, 10 scheduled sessions, PRESENT at 5 → August usage = 50% of plan price, plus September 1st prepaid.

## Convert to quarterly (first-month bill only)

Only the **unpaid upcoming prepaid** created at that first month-end can convert (`purchaseMeta.firstMonthConvertToQuarterly`).

- `POST /billing/:id/convert-quarterly` (staff, student, parent)
- Changes the next membership to the batch’s quarterly plan and the invoice amount to the quarterly price
- Does **not** change the usage invoice
- **Not** offered on prepaid-at-join invoices or later renewals
- Rejected if the invoice is already paid, is usage, or lacks the convert flag

## Switch vs new joiner

**Switch** — keep the current-month invoice; the **next** 1st-of-month invoice is for the destination batch:

- `POST /batches/:id/switch`, or
- Unenroll from A then enroll in a **different** batch B in the **same calendar month**

**New joiner** — apply prepaid-now vs postpaid rules above:

- First enroll this period
- Unenroll and **stay out** until a later month, then enroll
- Unenroll and **rejoin the same batch** (not a switch)

Unenroll does **not** void current-period pending invoices (so a later same-month enroll in another batch can keep them). If they stay out through month-end, unpaid `PREPAID_FULL` invoices are deleted; usage invoices are kept.

## Worked examples

| What happened | Invoice |
| --- | --- |
| Join 1 Aug, or before the batch’s first August session | Full August prepaid now. Later months: 1st-of-month prepaid. |
| Join 15 Aug, attend 5 of 10 | No invoice now. Month-end: August 50% usage + September 1st prepaid (optional convert to quarterly). |
| Join 15 Aug, attend 0 of 10 | No invoice now. Month-end: no usage invoice; September 1st prepaid if still enrolled. |
| Paid August on A, switch to B on 15 Aug | Keep August invoice. September 1st invoice is for B. |
| Paid August on A, unenroll, enroll B on 20 Aug | Same as switch. |
| Paid August on A, unenroll, join B in September | B is a new joiner. |
| Unenroll and rejoin the **same** batch | New joiner, not a switch. |

## Discover / checkout

| Join type | Discover |
| --- | --- |
| Prepaid-at-join | Checkout hold, then enroll |
| Postpaid first month | Enroll now, no checkout |
| Switch | Enroll now, no checkout |

Staff, bulk, and parent enroll always seat immediately (invoice only when prepaid-at-join).

## Out of scope

- Per-session pricing every month (only the first partial month)
- Quarterly session proration (quarterly is always full prepaid from the 1st)
- Studio timezone (UTC calendar months)
- Auto-refund of unused prepaid sessions
- Convert to quarterly except on that first-month settlement prepaid

## Tests

Do not migrate existing invoice rows. Each case **creates its own batches** so prepaid vs postpaid is owned by the fixture, not by seed kids/beginner schedules.

Shared helpers:

- `apps/step-up/e2e/fixtures/billing-calendar.ts` — UTC schedule builders (`prepaidScheduleJson` starts next month; `postpaidScheduleJson` already had a session this month)
- `apps/step-up/e2e/http/billing-fixtures.ts` — HTTP factories (`enrollPrepaid`, `enrollPostpaid`, `enrollUnpaidOnPostpaidBatch`)
- Smoke mirrors the same schedules in `apps/step-up/e2e/smoke/fixtures.ts`

| Case | How to build it |
| --- | --- |
| Prepaid-at-join | `enrollPrepaid` — staff enroll on a next-month schedule → `PREPAID_FULL` PENDING, seated, `monthlyUnpaid` |
| Postpaid first month | `enrollPostpaid` — first session this month already started → `invoice: null`, `FIRST_POSTPAID`, not `monthlyUnpaid`. Skip on UTC 1st. |
| Unpaid + markable session | `enrollUnpaidOnPostpaidBatch` — prepaid on owned A, **switch** onto owned in-progress B (product switch, not seed) |
| Discover prepaid | `POST /batches/:id/purchase` on a prepaid batch → checkout hold, not seated |
| Discover postpaid / switch | Same purchase path → enroll now, no invoice |
| Month-end usage + convert flag | Unit tests on `rollEndedActiveToNextDue` (daily job only enqueues; no HTTP worker) |

Canonical HTTP contract: `apps/step-up/e2e/http/billing-calendar.http.spec.ts`. Seed batches stay for auth, roles, and shared shells — not for join billing.

Do not mark the seed DUE membership (`e2e-membership-student-due-1`) paid. That flips it to ACTIVE and hides the student subscriptions renew button used by `@critical` journeys. DUE → paid → ACTIVE is covered by membership unit tests.
