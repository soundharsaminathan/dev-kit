# Step Up Flow Coverage Matrix

Product contract for automated testing. Roles use the canonical enum:
`OWNER` · `STAFF` (admin) · `TRAINER` · `STUDENT` · `PARENT`.

**Status legend:** `Covered` · `Partial` · `Planned` · `Gap`

**Test layer legend:** `Playwright` · `API` · `UI` · `Unit` · combinations

---

## Category A — Critical End-to-End Journeys

| ID | Module | Flow | Role(s) | Importance | Test layer | Status | Spec / notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Authentication | Guest → login → role shell | All | Critical | Playwright | Covered | `role-shells.spec.ts` |
| A01a | Authentication | Login → logout → login as second account | OWNER → STUDENT | Critical | Playwright | Covered | `login-logout-switch.spec.ts` + smoke `auth-switch.smoke.spec.ts` |
| A01b | Home | Owner dashboard metric + funnel tiles by period | OWNER | Critical | Playwright | Covered | `owner-dashboard-tiles.spec.ts` |
| A02 | Authentication | Incomplete student → onboarding gate | STUDENT | Critical | Playwright | Covered | `onboarding-gate.spec.ts` |
| A03 | Onboarding | New student onboarding → dashboard | STUDENT | Critical | Playwright + API | Covered | `onboarding-wizard.spec.ts` + gate |
| A04 | Discover | Browse / filter batches | STUDENT, PARENT | Critical | Playwright + UI | Partial | Book smoke + FilterChipRow UI |
| A05 | Booking | Discover → book trial → payment hold → confirm | STUDENT, PARENT | Critical | Playwright + API | Partial | API confirm in `product-smokes`; full UI checkout Gap |
| A06 | Attendance | Student views attendance history | STUDENT, PARENT | Critical | Playwright | Covered | `student-attendance.spec.ts` |
| A07 | Attendance | Trainer marks attendance → student notified | TRAINER → STUDENT | Critical | Playwright + API | Covered | `attendance-missed-session.spec.ts` |
| A08 | Attendance | Trainer bulk mark-all-present + exceptions | TRAINER, STAFF | Critical | Playwright + API | Covered | `trainer-bulk-attendance.spec.ts` + API |
| A09 | Notifications | Open notification → deep link | STUDENT | Critical | Playwright + UI | Covered | `notification-journey.spec.ts` + panel UI tests |
| A10 | Membership | Purchase / active / expire / renew → access | STUDENT, STAFF | Critical | API + Playwright | Partial | renew/access API; purchase E2E Partial |
| A11 | Batches | Create batch → assign trainer → schedule → activate | OWNER, STAFF | Critical | Playwright + API | Covered | `admin-batch-management.spec.ts` |
| A12 | Billing | View payments / mark paid / invoices | OWNER, STAFF | Critical | Playwright + API | Covered | `admin-payments.spec.ts` + billing API |
| A13 | Home | Student home loads | STUDENT | Critical | Playwright | Covered | `student-home.spec.ts` |
| A14 | Family | Parent home / child context | PARENT | Critical | Playwright + UI | Partial | Parent smoke + ChildSwitcher UI |
| A15 | Chat | Messages index loads | STUDENT | High | Playwright | Covered | `product-smokes` chat |
| A16 | Staff bookings | Staff bookings index | STAFF | High | Playwright | Covered | `product-smokes` |
| A17 | Subscriptions | Student subscriptions page | STUDENT | Critical | Playwright | Covered | `student-subscriptions.spec.ts` |
| A18 | Check-in | Student QR check-in | STUDENT, PARENT | High | API | Partial | QR mark covered in API; full UI Gap |
| A19 | Calendar | View schedule (member / staff) | All | High | Playwright + UI | Partial | EventChip UI; page smoke Planned |
| A20 | a11y | Login + /me critical axe | Guest, STUDENT | High | Playwright | Covered | `smoke-a11y.spec.ts` |
| A21 | Contests | Staff create / student enter | STAFF, STUDENT | Medium | API | Partial | Service specs exist |
| A22 | Certificates | Design template / issue | OWNER, STAFF | Medium | UI + API | Partial | Layout + VariablePicker |
| A23 | Retention | Staff retention dashboard | OWNER, STAFF, TRAINER | Medium | API | Partial | Controller roles covered |
| A24 | Social | Follow / profile visibility | STUDENT | Medium | UI + API | Covered | Follow button + social specs |
| A25 | Locations | Browse locations | STUDENT, STAFF | Medium | Unit | Partial | Upload helpers tested |

---

## Category B — Business Rules (API / Service)

| ID | Module | Flow / rule | Role(s) | Importance | Test layer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B01 | Attendance | Mark present | TRAINER+ | Critical | API | Covered |
| B02 | Attendance | Mark absent → MISSED_SESSION | TRAINER+ | Critical | API | Covered |
| B03 | Attendance | Bulk mark all present | TRAINER+ | Critical | API | Covered |
| B04 | Attendance | Reject without membership | TRAINER+ | Critical | API | Covered |
| B05 | Attendance | Duplicate upsert (session+student) | TRAINER+ | Critical | API | Covered |
| B06 | Attendance | QR create / verify / mark | STUDENT, PARENT | High | API | Covered |
| B07 | Attendance | Parent QR requires linked child | PARENT | High | API | Covered |
| B08 | Attendance | Session roster / listBySession | TRAINER+ | High | API | Covered |
| B09 | Membership | Assign / purchase for batch | STAFF, STUDENT | Critical | API | Covered |
| B10 | Membership | Renew expires old → new ACTIVE | STAFF | Critical | API | Covered |
| B11 | Membership | findActiveForBatch access gate | System | Critical | API | Covered |
| B12 | Membership | Family pack seat / batch picks | STAFF, PARENT | High | API | Covered |
| B13 | Membership | membershipCoversBatch helper | System | Critical | Unit | Covered |
| B14 | Booking | Create trial / private | STUDENT+ | Critical | API | Covered |
| B15 | Booking | Schedule conflict rejection | STUDENT+ | Critical | API | Covered |
| B16 | Booking | Confirm / abandon payment | STUDENT, PARENT | Critical | API | Covered |
| B17 | Booking | Capacity / duplicate prevention | STUDENT+ | Critical | API | Partial |
| B18 | Billing | markPaid | OWNER, STAFF | Critical | API | Covered |
| B19 | Billing | listByStudio / listForStudent | OWNER, STAFF, STUDENT | High | API | Covered |
| B20 | Billing | Trainer payment analytics | OWNER, STAFF, TRAINER | Medium | API | Covered |
| B21 | Notifications | Create + dedupeKey | System | Critical | API | Covered |
| B22 | Notifications | Mark read / mark all read | Owner user | Critical | API | Covered |
| B23 | Notifications | patchOne read/unread/archive | Owner user | High | API | Covered |
| B24 | Notifications | softDelete | Owner user | High | API | Covered |
| B25 | Notifications | listForUser pagination | Owner user | High | API | Covered |
| B25b | Notifications | Preferences / quiet hours / devices | Owner user | High | API + HTTP | Covered |
| B25c | Notifications | Gateway auth / badge / read_all | System | High | API | Covered |
| B25d | Notifications | Delivery push skip / enqueue / digest / retention | System | High | API | Covered |
| B26 | Batches | Create / update / activate | OWNER, STAFF, TRAINER | Critical | API | Covered |
| B27 | Batches | Delete (OWNER, STAFF) | OWNER, STAFF | Critical | API | Covered |
| B28 | Batches | Enroll with family/parent gate | STUDENT, PARENT, staff | High | API | Covered |
| B29 | Batches | Capacity rules | System | Critical | API | Covered |
| B30 | Calendar | Schedule conflict detection | System | Critical | API | Covered |
| B31 | Permissions | RolesGuard matrix | All | Critical | API | Covered |
| B32 | Chat | Send / react / crypto | Members | High | API | Covered |
| B33 | Users | Student funnel / PII crypto | System | High | API | Covered |
| B34 | Contests | CRUD + enter | STAFF, STUDENT | Medium | API | Covered |
| B35 | Media | Upload constraints | Authenticated | Medium | API | Covered |
| B36 | Branches | Location CRUD | OWNER, STAFF | Medium | API | Covered |
| B37 | Jobs | Retention / notification processors | System | Medium | API | Covered |

---

## Category C — UI Module Behavior

| ID | Module | Component / behavior | Role(s) | Importance | Test layer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | Attendance | Roster select / mark / mark-all | TRAINER | Critical | UI | Covered |
| C02 | Discover | FilterChipRow toggle pressed state | STUDENT | High | UI | Covered |
| C03 | Batches | BatchFiltersToolbar status/category | STAFF | High | UI | Covered |
| C04 | Calendar | EventChip select + compact | All | High | UI | Covered |
| C05 | Notifications | Panel mark read / mark all | All | Critical | UI | Covered |
| C06 | Social | FollowButton states | STUDENT | Medium | UI | Covered |
| C07 | Family | ChildSwitcher | PARENT | High | UI | Covered |
| C08 | Certificates | VariablePicker insert | STAFF | Medium | UI | Covered |
| C09 | Certificates | Layout / bind variables | STAFF | Medium | Unit | Covered |
| C10 | Checkout | Checkout utils | STUDENT | High | Unit | Covered |
| C11 | Chat | Optimistic send / reactions | Members | Medium | Unit | Covered |
| C12 | Auth | require-auth helpers | All | Critical | Unit | Covered |
| C13 | Layout | Notification deep links | All | Critical | Unit | Covered |
| C14 | Batch card | Full / CTA rendering | STUDENT | Medium | UI | Planned |
| C15 | Payment sheet | Mark-paid method confirm | STAFF | High | UI | Planned |

---

## Category D — Permission Matrix

| Feature | OWNER | STAFF | TRAINER | STUDENT | PARENT | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Create batch | ✅ | ✅ | ✅ | ❌ | ❌ | Covered |
| Delete batch | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Mark attendance / roster | ✅ | ✅ | ✅ | ❌ | ❌ | Covered |
| Confirm / abandon booking payment | ❌ | ❌ | ❌ | ✅ | ✅ | Covered |
| Mark invoice paid | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Home goals | ❌ | ❌ | ❌ | ✅ | ✅ | Covered |
| Manage subscriptions catalog | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Purchase / renew membership (self) | ❌ | ❌ | ❌ | ✅ | ✅ | Covered |
| Assign membership (staff) | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Sessions create / update | ✅ | ✅ | ✅ | ❌ | ❌ | Covered |
| Studio settings (write) | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Transfer studio ownership | ✅ | ❌ | ❌ | ❌ | ❌ | Covered |
| Retention dashboard | ✅ | ✅ | ✅ | ❌ | ❌ | Covered |
| Certificate templates write | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Contest manage | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Contest enter | ❌ | ❌ | ❌ | ✅ | ✅ | Covered |
| Contest score (STAFF/TRAINER) | ❌ | ✅ | ✅ | ❌ | ❌ | Covered |
| Branch write | ✅ | ✅ | ❌ | ❌ | ❌ | Covered |
| Student import / staff user ops | ✅ | ✅ | ❌/✅* | ❌ | ❌ | Covered |

\* Trainer allowed on selected student roster endpoints only — see `permission-matrix.spec.ts`.

---

## Category E — Database Reliability

| ID | Check | Importance | Layer | Status |
| --- | --- | --- | --- | --- |
| E01 | Empty DB → migrate deploy | Critical | Migration smoke | Covered |
| E02 | Core enums present (UserRole, AttendanceStatus, BookingStatus) | Critical | Migration smoke | Covered |
| E03 | Core tables present | Critical | Migration smoke | Covered |
| E04 | Notification userId+dedupeKey unique index | Critical | Migration smoke | Covered |
| E05 | Membership / Subscription / Session tables | Critical | Migration smoke | Covered |
| E06 | Re-apply migrations from empty (`--upgrade`) | High | Migration smoke | Covered |
| E07 | E2E seed (`prisma:seed:e2e`) after migrate | Critical | CI + seed-e2e script | Covered |
| E08 | Foreign-key / required-field assertions | High | Migration smoke | Covered |
| E09 | Analytics seed (`prisma:seed:analytics`) for Payments / Retention / funnel demos | Medium | Manual QA seed | Covered |

---

## Regression vs Nightly

| Suite | When | Scope | Target |
| --- | --- | --- | --- |
| PR regression | Pull requests touching Step Up | Vitest API + Vitest UI + Playwright `@critical` | &lt; 15 min |
| Merge queue | `merge_group` | Full Step Up Playwright + migration smoke | &lt; 45 min |
| Deployed smoke | After `step-up` branch deploy (Pages + Cloud Run) | Per-role path sweeps + interactive flows against `https://step-up.pages.dev` (`@smoke`), isolated `studio-smoke-1` tenant | &lt; 45 min |
| Nightly | 18:00 UTC + manual | All Vitest + all Playwright + Chromium/Firefox/WebKit + mobile subset | Full artifacts |

Deployed smoke scripts live under `apps/step-up/e2e/smoke/` and `apps/step-up-api/prisma/{seed,cleanup}-smoke.ts`. Requires GitHub secret `STEP_UP_SMOKE_PASSWORD` plus existing Firebase / DB secrets.

---

## Definition of Done (feature)

A Step Up feature is complete only when:

1. Feature implemented
2. API tests added for business rules
3. UI tests added when interactive module behavior changed
4. Critical flow row updated in this matrix
5. Permission cases covered (or matrix updated)
6. Migration smoke still green if schema changed
