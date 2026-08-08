---
name: step-up-negative-path-tests
description: >-
  Prevents Step Up regressions by requiring tests for edge and negative paths
  (unpaid, denied roles, expired membership, mid-flow payment, empty roster),
  not only happy-path seeds. Use when changing attendance, billing, membership,
  enrollment, booking, checkout, authz, or any Step Up API/UI status machine;
  when fixing a production bug; or when writing/updating unit, @http, @critical,
  or @smoke tests.
---

# Step Up negative-path tests

Remember to write tests. At least add a negative path in the smoke suite.

Happy-path seed data (ACTIVE membership, paid invoice, enrolled student) hides
real failures. The unpaid-attendance miss: mark required ACTIVE membership, but
staff enroll + unpaid invoice (and mid-month pay → next-month period) still
showed on the roster — smoke only marked the paid seed student.

## When this applies

Any change that gates an action on status, payment, membership, enrollment,
role, or time window. Especially:

- attendance mark / roster / QR
- invoices mark-paid / renew
- batch enroll / unenroll
- booking / checkout holds
- role deny paths

## Required coverage (same change)

Do not ship domain logic with only the green-path assertion.

| Layer | Minimum |
|---|---|
| Unit (API or web) | One negative or edge case that would have caught the bug |
| Smoke `@smoke` | At least one negative path for the affected staff/student flow |

Prefer also `@http` or `@critical` when the bug is click → API → UI.

## Negative path means

Assert the awkward case, not only success:

- **Allow with warning** — unpaid mark → confirm → API succeeds
- **Deny** — wrong role, too early window, not enrolled → 4xx / redirect / disabled
- **After state change** — mark paid, then action that previously failed now works
- **Partial** — bulk mark: some succeed, unpaid/failed counted

## Smoke suite rules

Location: `apps/step-up/e2e/smoke/*.smoke.spec.ts` (`@smoke`).

- Do **not** only sweep routes or click the paid seed student.
- Add a focused negative/edge case next to the related happy smoke (e.g. trainer
  attendance unpaid confirm, staff denied path, student 403 mark).
- Prefer `apiRequest` setup + UI assert, or HTTP deny, matching existing smoke
  style (`trainer.smoke.spec.ts` role-deny + mark-present patterns).
- Use `data-testid` / roles on primary CTAs (`mark-present-*`, `confirm-mark-paid`).
- If seed lacks the edge state, extend `seed-e2e` / `SMOKE` — do not skip the case.

## Unit test checklist (hot paths)

Before claiming done, ask:

1. What status makes this fail or warn? (unpaid, DUE, EXPIRED, PENDING invoice, no membership yet)
2. Is that state asserted in a unit test with the **real eligibility rule**?
3. Is there a smoke (or `@http` / `@critical`) negative path for the same rule?

If (2) or (3) is no → add it in this PR.

## Anti-patterns

- Only testing ACTIVE + paid seed
- Page-load / route-sweep as the only smoke for a mutation flow
- Asserting error toast text without API/eligibility coverage
- Deferring “unpaid / after pay” to a follow-up

## Done bar

With the feature change:

- [ ] Unit: negative or edge path for the gate
- [ ] Smoke: negative path in `@smoke` for the flow
- [ ] Gate: `pnpm nx run step-up:test:regression` when Step Up web/API changed
