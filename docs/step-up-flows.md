# Step Up — Core Flow Documentation

> **Purpose**: Detailed flow reference for agents working on the Step Up codebase. Covers Payments, Enrollments, and User Lifecycle.

**Billing calendar** (when invoices are created, mid-month proration, switch vs new joiner): [step-up-billing-calendar.md](./step-up-billing-calendar.md)

---

## Table of Contents
1. [Payments Flow](#1-payments-flow)
2. [Enrollments Flow](#2-enrollments-flow)
3. [User Creation & Deletion Flow](#3-user-creation--deletion-flow)
4. [API Endpoints Reference](#4-api-endpoints-reference)
5. [Key Types & Constants](#5-key-types--constants)

---

## 1. Payments Flow

### 1.1 Overview

The payments system revolves around **Invoices** — the atomic billing unit. See [step-up-billing-calendar.md](./step-up-billing-calendar.md) for when invoices are created.

- Join on the 1st or before the batch’s first session → prepaid invoice at enroll/checkout
- Mid-month new joiner (after first session) → remaining-sessions `PREPAID_PRORATED` at enroll when sessions remain; next 1st-of-month prepaid on the 1st (or immediately after UTC day 20)
- Switch (or unenroll then enroll a different batch the same month) → keep the current invoice

**Invoice Kinds**:
| Kind | Description | Source |
|------|-------------|--------|
| `INDIVIDUAL` | Single student subscription | Auto-billed from batch plan |
| `FAMILY` | Family pack purchase | Studio-wide (Invoices page) |
| `COMBINED` | Merged household invoices | Staff action (FamilyCombineSheet) |

**Statuses**: `PENDING` → `PAID` / `OVERDUE` / `REFUNDED`

**Payment Methods**: `CASH` | `UPI_MANUAL` | `RAZORPAY`

---

### 1.2 Staff-Side: Invoice Management (`/app/invoices`)

**Route**: `src/routes/app/invoices.tsx`  
**Auth**: `requireAdmin` (OWNER/STAFF only)

#### UI Structure (3 Tabs)
```
┌─────────────────────────────────────────┐
│ Individual  │ Family  │ Refunds         │
├─────────────────────────────────────────┤
│ • Student search filter                 │
│ • Status chips: All/Pending/Overdue/Paid│
│ • InvoiceCard list                      │
│   └─ CollectPaymentSheet (mark paid)    │
│   └─ RefundInvoiceSheet (partial/full)  │
│   └─ Print invoice                      │
└─────────────────────────────────────────┘
```

#### Key Actions

**Collect Payment** (`CollectPaymentSheet`)
```typescript
// POST /billing/:id/paid
{
  paymentMethod: "CASH" | "UPI_MANUAL",
  referralDiscount: number,  // optional
  studioDiscount: number     // optional
}
```
- Opens from InvoiceCard "Collect payment" button
- Calculates net due: `amount - referralDiscount - studioDiscount`
- Requires payment method selection (Cash/UPI)
- On success: invalidates `["invoices", studioId]` + shows toast "Payment recorded. Receipt emailed."

**Refund Invoice** (`RefundInvoiceSheet`)
```typescript
// POST /billing/:id/refund
{
  amount: number,
  reason?: string
}
```
- Only enabled for `PAID` invoices with `refundableAmount > 0`
- `refundableAmount = amount - refundedAmount`
- Supports partial refunds
- On success: invalidates invoices + trainer analytics

**Family Combine** (`FamilyCombineSheet`)
```typescript
// POST /billing/family-combine
{
  studioId,
  purchaserUserId: ownerId,
  invoiceIds: string[],
  familyDiscount: number
}
```
- Triggered from Family tab → tap family group, **or** from Individual / student Collect payment when the household (or same student) has 2+ unpaid invoices
- Filters unpaid individual invoices for family members (and the student’s own invoices)
- Pre-selects the opened invoice; staff can pay that one alone or combine with siblings / next-month bill
- Proportionally allocates discount via `allocateFamilyDiscount()`
- Creates `COMBINED` invoice; originals get `combineMeta`
- Minimum 2 invoices required to combine; single selection opens CollectPaymentSheet

---

### 1.3 Staff-Side: Student Invoice Actions (`/app/students/$id`)

**Route**: `src/routes/app/students/$id.tsx`

#### Invoice Section Actions
- **Mark Paid** → Opens `AppSheet` with same CollectPaymentSheet logic
- **Print Invoice** → Generates printable receipt via `printInvoice()`

---

### 1.4 Member-Side: Checkout Flows

#### A. Booking Checkout (`/me/checkout/$bookingId`)
**Route**: `src/modules/checkout/checkout-page.tsx`  
**Trigger**: Member books trial/open seat/private → booking status `AWAITING_PAYMENT`

**Flow**:
```
1. Load booking → shows 10-min countdown (paymentHoldExpiresAt)
2. "Pay securely" → POST /bookings/:id/create-payment-order
3. Razorpay checkout (demo mode = auto-confirm)
4. POST /bookings/:id/confirm-payment with Razorpay response
5. On success → booking status PENDING → redirect to /me/bookings
6. Timer expiry → POST /bookings/:id/abandon-payment → CANCELLED
```

#### B. Invoice/Plan Checkout (`/me/checkout/invoice/$invoiceId`)
**Route**: `src/modules/checkout/invoice-checkout-page.tsx`  
**Trigger**: Member purchases plan from batch detail → invoice status `PENDING`

**Flow**: Identical to booking checkout but:
- Creates payment order for `/billing/:id/create-payment-order`
- Confirms via `/billing/:id/confirm-payment`
- On success → invoice `PAID`, membership `ACTIVE`

#### Timer Logic (Both)
- `paymentHoldExpiresAt` from backend (10 min from creation)
- Client-side countdown (`secondsLeft()` every 250ms)
- At expiry: auto-abandon + show "Hold expired" screen
- Member can "Try again" → fresh booking/invoice

---

### 1.5 Payment Analytics (`/app/payments`)

**Route**: `src/routes/app/payments.tsx`  
**Auth**: TRAINER sees own; STAFF/OWNER can filter by trainer

**API**: `GET /billing/analytics/trainer/:trainerId?studioId&bucket&from&to`

**Response** (`TrainerPaymentAnalytics`):
```typescript
{
  totals: { collected, pending, overdue, refunded, platformFees, netCollected },
  byStatus: { PAID/PENDING/OVERDUE/REFUNDED: { count, amount } },
  byPaymentMethod: { CASH/UPI_MANUAL/RAZORPAY: { count, amount } },
  byBatch: [{ batchId, batchName, studentCount, invoiceCount, collected, pending, overdue, refunded }],
  invoices: [{ id, studentId, studentName, amount, status, paymentMethod, paidAt }],
  series: [{ start, end, collected, netCollected, invoiceCount }],
  comparison: { previousFrom, previousTo, netCollectedDelta, netCollectedDeltaPct },
  pendingPayments: [{ invoiceId, studentId, studentName, amount, status, dueDate, batchId, batchName }]
}
```

**Charts**: Bar/Area/Line (Recharts) — toggle via `ToggleButtonGroup`  
**Export**: CSV download (net collected, pending, overdue, by payment method)

---

### 1.6 Invoice Type Definitions

**File**: `src/modules/payments/invoice-types.ts`

```typescript
type CoveredSeat = { studentId: string; seatRole: "ADULT" | "KID"; batchId?: string };

type CombineSource = {
  invoiceId: string;
  studentId: string;
  batchId: string | null;
  originalAmount: number;
  allocatedDiscount: number;
  netAmount: number;
};

type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  referralDiscount?: number;
  studioDiscount?: number;
  familyDiscount?: number;
  refundedAmount?: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  paymentMethod?: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  kind: "FAMILY" | "INDIVIDUAL" | "COMBINED";
  batchId?: string | null;
  batchName?: string | null;
  student?: { name: string };
  membership?: { periodStart?: string | null } | null;
  familySummary?: { planName, adultCount, kidCount, coveredStudents } | null;
  purchaseMeta?: { subscriptionId, purchaserUserId, coveredStudents } | null;
  combineMeta?: { sources: CombineSource[] } | null;
};

type StudioFamily = {
  ownerId, ownerName, ownerRole, ownerPhotoUrl,
  members: [{ id, name, photoUrl, seatRole }]
};

function allocateFamilyDiscount(amounts[], familyDiscount): number[]
```

---

## 2. Enrollments Flow

### 2.1 Enrollment Modes (Batch-Level)

**Batch property**: `enrollmentMode: "STAFF_ONLY" | "SELF_JOIN"`

| Mode | Student Self-Enroll | Staff Enroll |
|------|---------------------|--------------|
| `STAFF_ONLY` | ❌ | ✅ |
| `SELF_JOIN` | ✅ (via member app) | ✅ |

Set at batch creation (`/app/batches/new`) or edit (`/app/batches/$id`).

---

### 2.2 Staff-Side Enrollment

#### A. Create Student + Optional Enroll (`/app/students/new`)
**Component**: `MemberRegistrationForm` (`src/modules/members/member-registration-form.tsx`)

**Steps**:
1. **Details**: Name, Email, Phone, Gender, Age Range
2. **Dance Styles**: `StyleSpreePicker` (multi-select)
3. **Optional Batch**: Dropdown of active batches (if `kind="student"`)

**Submit** → `POST /users`:
```typescript
{
  name, email, phone, gender, ageRange, styles[],
  batchId?,          // if selected
  temporaryPassword  // auto-generated "Su-xxx"
}
```
**Response**: `CreatedMember { id, name, email, temporaryPassword }`
- Shows credentials once (must share immediately)
- Invalidates: `studio-members`, `student-funnel`, `student-directory`, `batch`

#### B. Bulk Import Students (`/app/students/import`)
**Route**: `src/routes/app/students/import.tsx`

**Flow**:
1. Upload `.xlsx` (template: Name, Email, Gender, Age)
2. `read-excel-file` → `parseStudentImportRows()`
3. Preview valid rows (skips invalid: missing name, bad email, invalid gender/age)
4. `POST /users/bulk { students[] }` → backend maps exact age to AgeRange → `BulkImportResult { created, skipped }`

#### C. Student Detail Actions (`/app/students/$id`)
**Route**: `src/routes/app/students/$id.tsx`

**Enrollment-Related Actions** (from Actions menu):
- **Switch Batch** → `StudentBatchEnrollmentActions` → `POST /batches/:id/switch`
- **Unenroll** → `StudentBatchEnrollmentActions` → `POST /batches/:id/unenroll`

---

### 2.3 Staff-Side: Switch Batch (`StudentBatchEnrollmentActions`)

**Component**: `src/modules/batches/student-batch-enrollment-actions.tsx`

**Flow**:
1. Click "Switch" on batch row → opens sheet
2. `GET /batches/:id/switch-targets?studentId&includeAllPrices`
   - Returns eligible target batches (same category, open seats, matching plan by default)
3. Select target → `POST /batches/:id/switch { studentId, toBatchId, includeAllPrices? }`
4. On success: invalidates both batches + student profile + batches list
5. No new invoice this month; next 1st-of-month invoice follows the destination batch (see billing calendar)

---

### 2.4 Staff-Side: Unenroll (`StudentBatchEnrollmentActions`)

**Flow**:
1. Click "Unenroll" → opens sheet with preview
2. `GET /batches/:id/unenroll-preview?studentId`
   - Returns: `futureBookings`, `pendingInvoice` (will be voided), `refundableInvoice`
3. Optionally check "Refund payment" → enter amount ≤ `refundableAmount`
4. `POST /batches/:id/unenroll { studentId, refund, refundAmount? }`
5. On success: invalidates batch, student profile, batches, invoices, trainer analytics

**Key Rules**:
- Past attendance preserved for analytics
- Future bookings cancelled
- Pending invoice voided
- Refund only if paid invoice exists with `refundableAmount > 0`

---

### 2.5 Member-Side Enrollment (Discover → Batch Detail)

**Component**: `BatchDetailPage` (`src/modules/discover/batch-detail.tsx`)

#### Entry Points from Batch Detail
| CTA | Condition | Action |
|-----|-----------|--------|
| **Choose a plan** | `hasPlans && !viewerEnrolled && showBookingCta` | Opens purchase sheet |
| **Request trial** | `showTrial` | Opens booking sheet (type=TRIAL) |
| **Book this class** | `showBookClass` | Opens booking sheet (type=OPEN_SEAT/PRIVATE) |
| **Try It** (mobile) | Multiple options | Bottom sheet with all CTAs |

#### A. Purchase Plan (Enroll via Subscription)
```typescript
// POST /batches/:id/purchase
{
  subscriptionId,
  purchaserUserId,
  coveredStudents: [{ studentId, seatRole: "ADULT"|"KID" }]
}
```
- Individual plans only (`kind: "INDIVIDUAL"`)
- Family plans handled studio-wide via Invoices
- On success: if invoice `PENDING` → redirect to `/me/checkout/invoice/$invoiceId`
- Mid-month new join: enrolled immediately, no checkout; first bill is at month-end
- Invalidates: batch, discover batches, memberships

#### B. Book Trial / Open Seat / Private
```typescript
// POST /bookings
{
  studioId, studentId, type: "TRIAL"|"OPEN_SEAT"|"PRIVATE",
  batchId?, notes?, trainerId?, sessionId?
}
```
- **TRIAL**: Requires `sessionId` (pick upcoming session)
- **OPEN_SEAT**: No sessionId; joins batch generally
- **PRIVATE**: Requires `trainerId`
- On success: if `AWAITING_PAYMENT` → redirect to `/me/checkout/$bookingId`
- Invalidates: student bookings, batch

#### C. Booking States (Member View)
| Status | UI | Actions |
|--------|-----|---------|
| `AWAITING_PAYMENT` | Timer + "Continue to payment" | Checkout |
| `PENDING` | "Request pending" | View bookings |
| `CONFIRMED` | "Request confirmed" | View bookings |
| `CANCELLED` | — | Re-book |

---

### 2.6 Batch Roster & Capacity

**Component**: `BatchRoster` (`src/modules/batches/batch-roster.tsx`)

**Data**: `GET /batches/:id` → returns `enrollments[]`, `enrollmentCount`, `occupiedSeats`, `remainingSeats`

**Capacity Validation** (edit batch):
```typescript
minCapacity = max(1, occupiedSeats)
capacityValue < minCapacity → error: "Capacity cannot be below X occupied seats"
```
- `occupiedSeats` = max of `occupiedSeats`, `enrollmentCount`, `enrollments.length`

---

## 3. User Creation & Deletion Flow

### 3.1 User Roles & Permissions

**File**: `src/lib/constants.ts`
```typescript
type UserRole = "SYSTEM_ADMIN" | "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";

const STAFF_ROLES = ["OWNER", "STAFF", "TRAINER"];      // /app access
const ADMIN_ROLES = ["OWNER", "STAFF"];                  // Studio admin ops
const MEMBER_ROLES = ["STUDENT", "PARENT"];              // /me access
const SYSTEM_ADMIN_ROLES = ["SYSTEM_ADMIN"];             // /admin access
```

---

### 3.2 Student Creation

#### A. Individual (Staff) → `/app/students/new`
- **Auth**: `requireAdmin` (OWNER/STAFF)
- **Form**: `MemberRegistrationForm` (2 steps)
- **Endpoint**: `POST /users`
- **Payload**:
```typescript
{
  name, email, phone, gender, ageRange, styles[],
  batchId?,                  // optional enroll
  temporaryPassword: "Su-xxx"  // generated client-side
}
```
- **Response**: `CreatedMember { id, name, email, temporaryPassword }`
- **Credentials**: Shown once in `TemporaryCredentialsPanel` (copy buttons)
- **Invalidates**: `studio-members`, `student-funnel`, `student-directory`, `batch`

#### B. Bulk Import → `/app/students/import`
- **Auth**: `requireAdmin`
- **Endpoint**: `POST /users/bulk { students: StudentImportRow[] }`
- **Row Validation**: `parseStudentImportRows()` checks:
  - Name required
  - Valid email format
  - Gender: "FEMALE" | "MALE"
  - Age: exact years (0–120). Backend assigns AgeRange:
    under 10 → `UNDER_10`, 10–19 → `TEN_TO_TWENTY`,
    20–39 → `TWENTY_TO_FORTY`, 40+ → `FORTY_PLUS`
- **Max**: `STUDENT_IMPORT_MAX` per import

#### C. Self-Registration (Public) → `/register`
- **Route**: `src/routes/register.tsx`
- **Flow**: Similar form → creates `STUDENT` with `onboardingCompletedAt = null`
- **Post-auth**: Redirects to `/me/onboarding` (dance styles, level, goals)

---

### 3.3 Trainer Creation

#### A. Individual (Staff) → `/app/trainers/new`
- **Auth**: `requireAdmin`
- **Form**: `MemberRegistrationForm` with `kind="trainer"`
- **Endpoint**: `POST /users` (same endpoint, role inferred)
- **No batch enrollment step** (trainers assigned to batches separately)

---

### 3.4 Student Deletion

**Route**: `/app/students/$id` → Actions menu → "Delete"

**Component**: `StudentDetailPage` (`src/routes/app/students/$id.tsx`)

**Flow**:
1. Open delete confirmation sheet (`AppSheet`)
2. Warning: "Removes enrollments, memberships, attendance. Cannot be undone."
3. `DELETE /users/studio/:studioId/students/:id`
4. On success:
   - Invalidates: `studio-students-search`, `student-directory`, `student-funnel`, `batches`
   - Removes: `student-profile` query cache
   - Navigate to `/app/students`
   - Toast: "Student deleted. Removed from this studio."

**Cascade Effects** (Backend responsibility):
- Enrollments removed
- Memberships cancelled
- Attendance records preserved (for analytics)
- Invoices remain (status `REFUNDED` if paid)
- Family links removed

---

### 3.5 Student Deactivation (Soft Delete)

**Route**: `/app/students/$id` → Actions menu → "Deactivate"/"Reactivate"

**Flow**:
1. Open toggle sheet → confirms action
2. `PATCH /users/studio/:studioId/students/:id { active: false|true }`
3. On success:
   - Invalidates same queries as delete
   - Toast: "Student deactivated — no member app access" / "Reactivated"

**Effect**: `active: false` blocks member app login; data preserved.

---

### 3.6 Trainer Deletion/Deactivation
- Similar flow via `/app/trainers/$id` (not shown in explored files but follows same pattern)
- Batch assignments removed on deletion

---

### 3.7 Password Reset (Staff-Initiated)

**Route**: `/app/students/$id` → Actions menu → "Reset password"

**Flow**:
1. Open sheet → "Generate temporary password"
2. `POST /users/studio/:studioId/students/:id/reset-password`
3. Response: `TemporaryCredentials { email, temporaryPassword }`
4. Shows `TemporaryCredentialsPanel` (copy buttons, shown once)
5. Student must set new password on next login

---

### 3.8 Family Linking

**Route**: `/app/students/$id` → "Link Family" button

**Flow**:
1. Open `AppBottomSheet` with `StudentSearchMultiselect`
2. Search studio users (students/parents), exclude already linked
3. Select multiple → `POST /users/studio/:studioId/families/link`
   ```typescript
   { anchorUserId: studentId, memberUserIds: string[] }
   ```
4. Creates `StudioFamily` with `ownerId` = anchor, `members` = selected
5. Enables family invoice combine + shared billing

---

## 4. API Endpoints Reference

### Payments / Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/studio/:studioId` | List all invoices (staff) |
| GET | `/billing/analytics/trainer/:trainerId` | Payment analytics |
| PATCH | `/billing/:id/paid` | Mark invoice paid (staff) |
| POST | `/billing/:id/refund` | Refund invoice (staff) |
| POST | `/billing/family-combine` | Combine family invoices (staff) |
| POST | `/billing/:id/create-payment-order` | Create Razorpay order (member) |
| POST | `/billing/:id/confirm-payment` | Confirm payment (member) |
| POST | `/billing/:id/abandon-payment` | Cancel hold (member) |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches/studio/:studioId` | List batches |
| GET | `/batches/:id` | Batch detail |
| POST | `/batches` | Create batch |
| PATCH | `/batches/:id` | Update batch |
| DELETE | `/batches/:id` | Delete batch (if no enrollments) |
| GET | `/batches/:id/switch-targets` | Eligible switch targets |
| POST | `/batches/:id/switch` | Switch student batch |
| GET | `/batches/:id/unenroll-preview` | Unenroll preview |
| POST | `/batches/:id/unenroll` | Unenroll student |
| POST | `/batches/:id/purchase` | Purchase plan (member) |
| POST | `/batches/:id/rate` | Rate batch (member) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings` | Create booking (member) |
| GET | `/bookings/:id` | Booking detail (checkout) |
| POST | `/bookings/:id/create-payment-order` | Create Razorpay order |
| POST | `/bookings/:id/confirm-payment` | Confirm payment |
| POST | `/bookings/:id/abandon-payment` | Cancel hold |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create student/trainer (staff) |
| POST | `/users/bulk` | Bulk import students |
| GET | `/users/studio/:studioId` | List studio members |
| GET | `/users/studio/:studioId/students/:id` | Student profile (staff) |
| PATCH | `/users/studio/:studioId/students/:id` | Update student |
| DELETE | `/users/studio/:studioId/students/:id` | Delete student |
| POST | `/users/studio/:studioId/students/:id/reset-password` | Reset password |
| POST | `/users/studio/:studioId/families/link` | Link family |
| GET | `/users/studio/:studioId/families` | List families |

### Auth / Onboarding
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login (email + password) |
| POST | `/auth/register` | Self-register student |
| POST | `/auth/forgot-password` | Request reset |
| POST | `/auth/refresh` | Refresh token |
| GET | `/me` | Current user profile |
| POST | `/me/onboarding` | Complete onboarding |

---

## 5. Key Types & Constants

### User Roles (`src/lib/constants.ts`)
```typescript
type UserRole = "SYSTEM_ADMIN" | "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";

STAFF_ROLES = ["OWNER", "STAFF", "TRAINER"];
ADMIN_ROLES = ["OWNER", "STAFF"];
MEMBER_ROLES = ["STUDENT", "PARENT"];
SYSTEM_ADMIN_ROLES = ["SYSTEM_ADMIN"];
```

### Enrollment Modes
```typescript
type EnrollmentMode = "STAFF_ONLY" | "SELF_JOIN";
```

### Invoice Statuses
```typescript
type InvoiceStatus = "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
```

### Payment Methods
```typescript
type PaymentMethod = "CASH" | "UPI_MANUAL" | "RAZORPAY";
type ManualPaymentMethod = "CASH" | "UPI_MANUAL";
```

### Booking Types
```typescript
type BookingType = "TRIAL" | "OPEN_SEAT" | "PRIVATE";
```

### Booking Statuses
```typescript
type BookingStatus = "AWAITING_PAYMENT" | "PENDING" | "CONFIRMED" | "CANCELLED";
```

### Membership Statuses
```typescript
type MembershipStatus = "ACTIVE" | "DUE" | "EXPIRED";
```

### Subscription Kinds
```typescript
type SubscriptionKind = "INDIVIDUAL" | "FAMILY";
type BillingCadence = "MONTHLY" | "QUARTERLY";
```

---

## 6. Critical Invariants & Rules

### Payments
- ✅ **Never modify paid invoices** — only refund via `/refund`
- ✅ **Family discount** allocated proportionally (`allocateFamilyDiscount`)
- ✅ **10-min payment hold** — auto-abandon on expiry
- ✅ **Receipt emailed** on `POST /billing/:id/paid` (backend)
- ✅ **Trainer analytics** invalidated on any payment/refund/combine

### Enrollments
- ✅ **Capacity ≥ occupied seats** — validated on batch edit
- ✅ **STAFF_ONLY** batches: no self-enroll from member app
- ✅ **Switch** preserves plan pricing unless `includeAllPrices=true`
- ✅ **Unenroll** voids pending invoice, preserves past attendance
- ✅ **Refund on unenroll** only if paid invoice with `refundableAmount > 0`

### Users
- ✅ **Student deletion** = hard delete (cascades enrollments, memberships)
- ✅ **Deactivation** = soft delete (`active: false`, blocks login)
- ✅ **Temporary password** shown **once** — must copy immediately
- ✅ **Bulk import** skips invalid rows; max `STUDENT_IMPORT_MAX` per upload
- ✅ **Family linking** enables combined invoices + shared billing

### Auth & Routing
- ✅ `requireAuth` / `requireAdmin` / `requireSystemAdmin` guard all protected routes
- ✅ `redirectIfAuthenticated` bounces signed-in users from `/login`, `/register`
- ✅ `mustChangePassword` forces `/profile/change-password` before any other route
- ✅ Student onboarding incomplete → redirects to `/me/onboarding`

---

## 7. Query Invalidation Patterns

### After Payment Actions
```typescript
queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
queryClient.invalidateQueries({ queryKey: ["billing", "trainer-analytics"] });
```

### After Enrollment Changes
```typescript
queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
queryClient.invalidateQueries({ queryKey: ["batches", studioId] });
queryClient.invalidateQueries({ queryKey: ["student-profile", studioId, studentId] });
queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
queryClient.invalidateQueries({ queryKey: ["billing", "trainer-analytics"] });
```

### After User Changes
```typescript
queryClient.invalidateQueries({ queryKey: ["studio-members", studioId] });
queryClient.invalidateQueries({ queryKey: ["student-funnel", studioId] });
queryClient.invalidateQueries({ queryKey: ["student-directory", studioId] });
queryClient.invalidateQueries({ queryKey: ["batches", studioId] });
queryClient.removeQueries({ queryKey: ["student-profile", studioId, studentId] });
```

---

## 8. File Map for Key Flows

```
src/
├── routes/
│   ├── app/
│   │   ├── payments.tsx              # Payment analytics dashboard
│   │   ├── invoices.tsx              # Invoice management (3 tabs)
│   │   ├── batches/
│   │   │   ├── new.tsx               # Create batch (wizard)
│   │   │   └── $id.tsx               # Edit batch + roster + enrollment actions
│   │   ├── students/
│   │   │   ├── new.tsx               # Create student (MemberRegistrationForm)
│   │   │   ├── import.tsx            # Bulk import
│   │   │   └── $id.tsx               # Student detail + delete/deactivate/reset/link
│   │   └── settings_/payments.tsx    # Studio payment settings
│   └── me/
│       ├── book.tsx                  # Discover entry
│       ├── batches/$id.tsx           # Member batch detail (enroll/purchase)
│       └── checkout/
│           ├── $bookingId.tsx        # Booking payment
│           └── invoice/$invoiceId.tsx # Plan payment
├── modules/
│   ├── payments/
│   │   ├── invoice-types.ts          # Core types + allocateFamilyDiscount
│   │   ├── collect-payment-sheet.tsx # Mark paid (staff)
│   │   ├── refund-invoice-sheet.tsx  # Refund (staff)
│   │   ├── family-combine-sheet.tsx  # Combine family invoices
│   │   ├── print-invoice.ts          # Printable receipt
│   │   └── invoice-bill.tsx          # Bill preview component
│   ├── batches/
│   │   ├── student-batch-enrollment-actions.tsx # Switch/Unenroll
│   │   ├── batch-roster.tsx          # Roster display
│   │   ├── batch-overview.tsx        # Batch header card
│   │   └── upload.ts                 # Cover image upload
│   ├── members/
│   │   ├── member-registration-form.tsx # 2-step create student/trainer
│   │   └── temporary-credentials-panel.tsx
│   ├── checkout/
│   │   ├── checkout-page.tsx         # Booking checkout (Razorpay)
│   │   ├── invoice-checkout-page.tsx # Plan checkout (Razorpay)
│   │   └── checkout-utils.ts         # Timer, Razorpay loader
│   ├── discover/
│   │   ├── batch-detail.tsx          # Member batch detail + enroll/purchase
│   │   └── use-discover.ts           # Batch query hook
│   └── students/
│       ├── parse-student-import.ts   # Excel parsing + validation
│       └── student-search-*.tsx      # Search components
└── lib/
    ├── require-auth.ts               # Route guards + role logic
    ├── constants.ts                  # Roles, enums, seed data
    └── onboarding.ts                 # Student onboarding redirect logic
```

---

## 9. Testing Notes

### E2E Tags (Playwright)
- `@critical` — Core flows (login, booking, payment, enrollment)
- `@http` — API contract tests
- `@perf` — Lighthouse budgets

### Key Test Files
```
src/
├── routes/
│   └── __tests__/              # Route-level tests
├── lib/
│   └── __tests__/              # Auth, formatting, constants
├── modules/
│   ├── payments/
│   │   ├── invoice-types.test.ts
│   │   └── print-invoice.test.ts
│   ├── students/
│   │   └── parse-student-import.test.ts
│   └── ui/
│       └── filter-chip-row.test.tsx
```

### Run Commands
```bash
pnpm test                 # Vitest unit
pnpm test:e2e             # Playwright full
pnpm test:e2e:critical    # Critical path only
pnpm test:smoke           # Smoke suite
```

---

*Generated from codebase exploration. Update when flows change.*