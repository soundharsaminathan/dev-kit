# Classa — Complete Feature Catalog

Classa is a dance studio operations product: classes, plans, attendance, billing, retention, and booking — plus a member app for students and parents, and a public marketplace for discovering studios in a city.

Tagline: *Dance studio operations, beautifully simple.*

This document is the **product feature inventory**. Flow-level rules (when invoices are created, how switch vs new joiner works, marketplace search/sort contracts) live in the linked specs at the end.

---

## 1. Product at a glance

| Surface | Who | Job |
|---|---|---|
| **Public marketplace** (`/`) | Anyone | Discover classes, studios, and trainers in a city and book a trial, join, private, or floor hire |
| **Studio app** (`/app`) | Owner, staff, trainer | Run the studio: batches, leads, attendance, money, contests, chat |
| **Member app** (`/me`) | Student, parent | Discover, book, attend, pay, chat, journey, social |
| **Platform admin** (`/admin`) | System admin | Create studios, toggle modules, platform invoices |
| **Studio marketing** (`/for-studios`) | Prospective studio owners | Product landing for studios (logged-out only) |

A **studio** is the tenant. Users belong to one studio except `SYSTEM_ADMIN`. Modules can be turned on/off per studio (feature flags). Marketplace listing and booking types are separate studio settings.

---

## 2. Roles and shells

| Role | Shell | What they can do |
|---|---|---|
| **SYSTEM_ADMIN** | `/admin` | Create studios and first users. Toggle per-studio modules. Platform invoices. Direct-login link for owners. |
| **OWNER** | `/app` | Full studio ops, including ownership-sensitive money, branding, Razorpay, Classa plan, AI integrations, and ownership transfer. |
| **STAFF** | `/app` | Same ops as owner except transferring ownership and some owner-only settings (branding, styles, payments, plan, integrations). |
| **TRAINER** | `/app` | Batches, roster, attendance, calendar, bookings, chat, payouts, retention. No student directory, catalog, invoices, or studio settings writes. |
| **STUDENT** | `/me` | Discover, book, attend, pay, chat, journey, social. Incomplete students are gated to `/me/onboarding`. |
| **PARENT** | `/me` | Same member surface, scoped to linked children (`ChildSwitcher` / `ActiveStudentProvider`). Book and rate on behalf of a child. |

Canonical enum: `OWNER` · `STAFF` · `TRAINER` · `STUDENT` · `PARENT` (+ `SYSTEM_ADMIN`).

Routing sends staff to `/app`, members to `/me`, and system admins to `/admin`. Students are **not** bounced off the public marketplace after login.

---

## 3. Studio feature flags

Per-studio module flags, controlled by System Admin at `/admin/studios/:id/features`. **Access** is separate from **configuration** (Payments enabled ≠ Razorpay keys configured).

Fail closed: missing row, unknown key, or globally off → disabled.

| Key | Category | What it gates |
|---|---|---|
| `chat` | Communication | Messages nav, encrypted chat API |
| `feed` | Communication | Social feed (staff + member) |
| `payments` | Finance | Payments dashboard, Razorpay checkout, payment settings |
| `expenses` | Finance | Expense tracking and reports |
| `payouts` | Finance | Trainer payouts |
| `contests` | Engagement | Contests (staff + member) |
| `bookings` | Operations | Bookings inbox (staff) and member bookings list |
| `data_import` | Operations | Bulk CSV/Excel import |
| `ai_agent` | Operations | Staff AI panel + AI provider settings |

Core studio ops (batches, students, attendance, invoices, calendar, locations, retention, certificates) stay available without a flag.

---

## 4. Public marketplace

`/` is inventory, not a brochure. First paint: **Chennai → Dance → Classes**.

### 4.1 Chrome

Same shell logged out and logged in:

```
Classa          City ▾
Dance | Music | Fitness | Art
Classes | Studios | Trainers
[ Search: class, studio, trainer ]
Kids · Adults · All · Beginner · Intermediate · Advanced
Today · Tomorrow · Weekend · Evening · Price · Area · Near me
list | map
```

Login only adds personal card state: enrolled, trial booked, remaining seats, child context, ability to rate.

### 4.2 Three objects, four books

| Object | Public routes | Card shows |
|---|---|---|
| **Class** | `/`, `/classes`, `/classes/:slug` | Cover, studio, trainer, area, next slot, from-price, seats, Book |
| **Studio** | `/studios`, `/studios/:slug` | Cover, locality, from-price of visible classes, stars, Book |
| **Trainer** | `/trainers`, `/trainers/:slug` | Photo, categories, studios they teach at, next slot, stars, Book |

| Book type | Meaning | Pay |
|---|---|---|
| **Trial** | Upcoming session of a class (default) | Free request. Studio confirms. |
| **Join class** | Enroll in that class | Existing invoice / checkout. Hidden if already enrolled or class is full. |
| **Private** | Trainer + floor + time | Razorpay hold if priced; else studio confirms. No membership required when the studio enables private. |
| **Floor hire** | Room + time, no trainer | Same pay rule as private. Studio-detail only, never a home-card action. |

Card CTA is always **Book**. Book is never a nav item. Full classes still allow trial (`Full` + `Trial open`).

### 4.3 Visibility and data quality

- Per-card image gates: missing class cover hides that class only; missing studio cover hides that studio card only; missing trainer photo hides that trainer only.
- Studio settings (eight toggles): listing, classes, trainers, ratings, trial, enrollment, private, floor hire. Off means hidden, not a dead button.
- Home class feed requires a next session within 35 days. A class with no upcoming session can still appear on the studio detail page; Book is hidden there.
- Public after **3** ratings; otherwise **New**. Stars are studio and trainer only, category-aware (Fitness does not lift Dance).
- Suspended studios (`Studio.status = SUSPENDED`) and their classes/trainers disappear from public feeds.

### 4.4 Search, sort, seats, price

- Search tokens are AND, case-insensitive, punctuation-folded. 3+ characters with no substring hit fall back to name trigram ≥ 0.35.
- Default sort is **availability** (bookable first). Search defaults to **relevance**. Other sorts: nearest, earliest, price, rating. Popularity exists on the API but is not a first-paint chip.
- Seat copy: `0` → Full; `1`–`5` → `N` seats left; `> 5` omitted. Trials and privates do **not** occupy class seats. No waitlist.
- Class cards show **From ₹X / month** (or `/ quarter`) = lowest active plan. No plan → no price (never ₹0). Private and floor hire show the exact slot price.

### 4.5 Auth, children, cancel

- Browse and open the book sheet without login. Submit requires register or sign-in (email + password or Google). After register the user is a `STUDENT`.
- “This is for my child” creates or selects a linked child. Bookings store `studentId` = the child. Child × audience mismatches are blocked (kids class vs adult booker, and the reverse).
- One live trial per `(sessionId, studentId)`. Cancelled trials may be rebooked. Parent and child are different student ids.
- Student/parent can cancel future `PENDING` / `CONFIRMED`. Paid private/floor: full refund if cancelled ≥ 12 hours before start. Studio-initiated cancel always refunds. Trial is free (no refund). Session cancel bulk-cancels trials on that session and notifies bookers.

### 4.6 Related public routes

| Route | Role |
|---|---|
| `/discover` | 301 → `/studios` with the same filters |
| `/studio/:id` | Legacy → current studio slug |
| `/$city/$place` | SEO indexes (style or locality) where search demand is real |
| `/privacy`, `/terms` | Legal |
| `/users/:id`, `/posts/:id` | Public social profile / post |
| `/for-studios` | Studio-owner marketing landing |

---

## 5. Studio app (`/app`) — run the studio

Primary tabs: Home, Batches, Trial caller (owner/staff), Calendar, Profile. Messages and Feed sit in the header when those flags are on.

### 5.1 Home

**Route:** `/app`

Role-aware dashboard:

- Metrics and current batches
- Pending booking requests (if `bookings` is on)
- Incomplete past sessions that still need attendance
- Student funnel tiles for owner/staff, by period (`lifetime` / month / quarter / half-year / year): signed-in only → trial attended → active → left batch
- Trainers see trainer-scoped home content

### 5.2 Batches (classes)

**Routes:** `/app/batches`, `/app/batches/new`, `/app/batches/:id`, `/app/batches/:id/settings`

A batch is a class with:

- Kids vs adults (`Batch.category`) plus marketplace fields: category (Dance / Music / Fitness / Art), class audience (kids / adults / both), class level (beginner / intermediate / advanced), public slug
- Capacity, remaining seats, enrollment mode (`STAFF_ONLY` or `SELF_JOIN`)
- Schedule (`scheduleJson`), branch, cover image
- One or more trainers (`BatchTrainer`, `sortOrder`)
- Linked plans (`BatchPlan`)
- Roster of enrollments
- Optional batch chat room

**Staff can:** create, edit, activate/deactivate, assign trainers, change schedule (API detects conflicts), manage roster, switch a student to another batch, unenroll (with preview of future bookings, pending invoice, refundable amount), open the attendance tab.

**Capacity rule:** cannot set capacity below occupied seats.

**Switch vs unenroll:** switch keeps this month’s invoice; the next 1st-of-month invoice follows the destination batch. Unenroll preserves past attendance, cancels future bookings. Rejoining the **same** batch later is a new joiner, not a switch.

### 5.3 Trial caller (leads)

**Route:** `/app/leads` — owner/staff only

Pipeline for people who signed up or were added but are not yet paying members. Seven exclusive sections (derived, not a stored status):

| Section | Meaning |
|---|---|
| **New** | Contact exists; no trial booked yet |
| **Trial booked** | Open trial (`PENDING` / `CONFIRMED`) |
| **Trial attended** | Trial session marked present |
| **Trial missed** | Trial session marked absent / missed |
| **Converted** | Now an active enrolled member |
| **Left** | Was enrolled; no longer active in a batch |
| **Archive** | `active: false` |

Date presets: trial booked is future-facing (today, tomorrow, this week, next week); trial attended / missed / converted are past-facing (today, yesterday, last 7 days).

Staff can quick-add a lead, add remarks (up to 2,000 characters), book or switch a trial, archive / unarchive. Mobile: peeking prev/current/next header plus horizontal swipe.

### 5.4 Students

**Routes:** `/app/students`, `/app/students/new`, `/app/students/:id`, `/app/students/import` — owner/staff

- Directory with search
- Create student (name, email, phone, gender, age range, dance styles, optional batch). Temporary password (`Su-xxx`) is shown once
- Bulk Excel import (Name, Email, Gender, Age). Invalid rows skipped. Age years map to ranges: under 10, 10–19, 20–39, 40+
- Per-student profile: enrollments, invoices, family, remarks
- Actions: switch batch, unenroll, mark paid, print invoice, link family, reset password, deactivate / reactivate, delete

**Deactivate** blocks member-app login and keeps data. **Delete** removes enrollments and memberships; attendance is kept for analytics; paid invoices stay as refunded; family links are removed.

**Family linking:** pick other students/parents as household members. Enables family packs and combined invoices.

### 5.5 Trainers

**Routes:** `/app/trainers`, `/app/trainers/new`

Trainer roster and create (same registration form, no enroll step). Trainers are assigned to batches separately. Marketplace: a trainer may belong to many studios (`TrainerStudio`, one home), have public categories, optional level, availability windows, and time-off blocks. Freelance trainers are allowed. Hiring a freelance trainer onto a studio is an ops action, not a student tab.

### 5.6 Bookings inbox

**Route:** `/app/bookings` — requires `bookings`

Review trial / open-seat / private / floor-hire requests. Confirm, cancel, or reschedule. Capacity and schedule conflicts are enforced on the API.

Booking statuses: `AWAITING_PAYMENT` → `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED`.

### 5.7 Calendar and sessions

**Routes:** `/app/calendar`, `/app/sessions/:id/attendance`, `/app/sessions/incomplete`

- Studio calendar of sessions, trials, and bookings
- Session attendance: present / absent, sources `TRAINER` / `DESK` / `QR`
- Bulk “mark all present” plus exceptions
- Add a trial student onto a session
- Incomplete past sessions list (home also surfaces these)
- Missed sessions notify the student
- Duplicate (session + student) attendance upserts are rejected

### 5.8 Locations (branches)

**Routes:** `/app/locations`, `/app/locations/new`, `/app/locations/:id`, `.../edit`, `.../classes`

Branches are floors / rooms. One class = one branch. A studio card in the marketplace uses the nearest branch that has inventory.

Per branch: map, gallery, hours, amenities, FAQs, testimonials, classes at that branch. Floor hire books the selected branch.

### 5.9 Subscriptions (catalog)

**Routes:** `/app/subscriptions`, `/app/subscriptions/new`, `/app/subscriptions/:id` — owner/staff

Plans sold to members:

- **Individual** (adult or kid)
- **Family packs:** 2 kids, 1 adult + 1 kid, 2 adults, 1 adult + 2 kids, 2 adults + 1 kid, 2 adults + 2 kids
- Cadence: monthly or quarterly
- Seat roles: `ADULT` / `KID`
- Linked to batches

Staff assign and renew memberships; students purchase and renew themselves on `/me`.

### 5.10 Invoices

**Route:** `/app/invoices` — owner/staff

Three tabs: Individual, Family, Refunds.

- Filter by student and status (all / pending / overdue / paid)
- **Collect payment** — cash or manual UPI, optional referral and studio discounts, receipt emailed
- **Refund** — full or partial on paid invoices (`refundableAmount = amount - refundedAmount`)
- **Family combine** — merge 2+ unpaid household invoices into a `COMBINED` invoice with optional family discount (allocated proportionally). Single selection falls back to collect payment
- Print invoice

Paid invoices are never edited in place — only refunded.

### 5.11 Payments analytics

**Route:** `/app/payments` — owner/staff, requires `payments`

Trainer payment analytics: collected / pending / overdue / refunded / platform fees / net. Breakdowns by status, payment method, and batch. Time series with previous-period comparison. Bar / area / line charts. CSV export.

Trainers see their own numbers; staff/owner can filter by trainer.

### 5.12 Expenses

**Routes:** `/app/expenses`, `/app/expenses/list`, `/app/expenses/categories`, `/app/expenses/reports` — owner/staff, requires `expenses`

- Categories
- One-off expenses (cash, bank transfer, UPI, card, cheque, other)
- Recurring expenses (daily / weekly / monthly / quarterly / yearly)
- Reports

### 5.13 Trainer payouts

**Routes:** `/app/payouts`, `/app/payouts/:payoutId` — requires `payouts`

Drafts built from taught sessions. Status: `DRAFT` → `SENT` → `PAID` / `CANCELLED`. Trainers are notified when a payout is sent.

### 5.14 Retention

**Route:** `/app/retention`

- Batch: renewal rate, at-risk students, absentee list after sessions
- Trainer: booking completion rates, recent students
- Paid-months and occupancy-style rollups, computed on the worker (scheduled analytics)

### 5.15 Contests

**Routes:** `/app/contests`, `/app/contests/new`, `/app/contests/:id` — requires `contests`

- Create contest (branch, dates, cover, default certificate template)
- Categories: name, dance style, age min/max, individual or group, max entries, max group size
- Assign judges (`STAFF` or `TRAINER`)
- Manage entries (`PENDING` / `CONFIRMED` / `WITHDRAWN`)
- Record scores and placements
- Issue certificates from a template
- Status: `DRAFT` → `OPEN` → `CLOSED` → `COMPLETED` / `CANCELLED`

### 5.16 Certificates

**Routes:** `/app/certificates`, `/app/certificates/new`, `/app/certificates/:id` — owner/staff

Visual template designer (canvas + variables). Contest entries can receive a `ContestCertificate` with a snapshot and certificate number. Templates can be attached at contest or category level.

### 5.17 Data import

**Route:** `/app/import` — owner/staff, requires `data_import`

Bulk import wizard. Job states: `PENDING` → `RUNNING` → `SUCCEEDED` / `FAILED`. Precheck validates plan names against the catalog. Entities include batches, enrollments, invoices. An import-status banner sits in the app shell while a job is active. Completion notifies staff.

Student Excel import at `/app/students/import` is a separate, simpler path.

### 5.18 Feed and messages

**Routes:** `/app/feed` (`feed`), `/app/messages`, `/app/messages/:id` (`chat`)

Studio-facing social posts and encrypted chat. See [§8 Communication](#8-communication-chat-feed-notifications).

### 5.19 Studio settings

**Route:** `/app/settings/*` — owner/staff (some owner-only)

| Page | Who | What |
|---|---|---|
| Profile | Admin | Studio name and basic information |
| Branding | Owner | Logo, hero desktop/mobile images used on member home and marketplace |
| Dance styles | Owner | Styles students and trainers can pick |
| classa listing | Admin | Eight marketplace visibility + booking toggles, plus media alerts (missing covers/photos) |
| Billing | Admin | Grace days, expiry alerts, admission fee, timezone |
| classa plan | Owner | Platform plan usage (`BASIC` / `ADVANCED`) and studio invoices from Classa |
| Payments | Owner + `payments` | GST, Razorpay keys |
| Team | Admin | Invite staff and trainers (`/join?token=`) |
| Integrations | Owner + `ai_agent` | AI provider (Groq / Gemini / OpenAI) and encrypted API key |
| Notifications | — | Placeholder (coming soon). Real prefs live in the header panel |
| Chat | — | Placeholder (coming soon) |

`/app/settings/features` redirects away — module flags live on `/admin`.

---

## 6. Member app (`/me`) — take class

Primary tabs: Home, Discover, Messages, Profile. Parents pick an active child; most APIs accept `studentId` for that child.

### 6.1 Onboarding

**Route:** `/me/onboarding`

Required until `onboardingCompletedAt` is set. Four steps:

1. **Profile** — name, photo, gender, date of birth or age
2. **Level** — brand new / some moves / intermediate / advanced
3. **Trial time** — pick a class session (unlocks next 2 sessions free) or ask the studio to call
4. **Trainer** — swipe/tap a trainer for the trial, or skip

### 6.2 Home

**Route:** `/me`

- Today timeline and next class
- Monthly session goal ring (target 1–4 sessions / month; parent can set per child)
- Achievements (`SESSIONS_COMPLETED`, `STREAK`, `CONTEST_ENTRY`)
- Journey stats
- Recommended batches
- Notices
- Marketplace “rate last class” prompt
- PWA install bar
- Child switcher for parents

### 6.3 Discover and booking

**Routes:** `/me/book`, `/me/bookings`, `/me/checkout/:bookingId`, `/me/checkout/invoice/:invoiceId`

- `/me/book` is the same class catalog as the public marketplace, plus personal state
- Book trial / join / private from class, studio, or trainer cards (unified book sheet)
- My bookings: upcoming and past; continue payment, cancel
- Checkout: 10-minute payment hold (`paymentHoldExpiresAt`). Razorpay (demo mode auto-confirms). Timer expiry abandons the hold and cancels. “Try again” creates a fresh hold
- Invoice checkout uses the same timer against `/billing/:id/*`

Discover prepaid-at-join holds payment, then enrolls. Mid-month remaining enrolls now and collects at the desk. Switch enrolls now with no checkout.

### 6.4 Calendar, attendance, check-in

| Route | What |
|---|---|
| `/me/calendar` | Personal schedule |
| `/me/attendance` | History |
| `/me/check-in` | Student/parent QR scan or manual token → `POST /attendance/qr/verify`. Parent must be linked to the child |

Staff/trainer can also mark attendance from the session page (desk or trainer source).

### 6.5 Journey

**Route:** `/me/journey`

Visual timeline (React Flow) of the student’s studio life, with filter tags and XP-style points:

| Event | Typical XP |
|---|---|
| Joined studio | 50 |
| Joined a batch | 40 |
| Started a plan | 30 |
| Attended a class | 5 |
| Attendance streak (7 / 14 / 30 / 60 / 100) | 25 |
| Competition entry / placement | 80 |
| Certificate | 100 |
| Achievement | 60 |
| Trainer | 20 |
| Level up | 90 |
| Feedback / rating | 15 |

Stats: years learning, classes attended, attendance %, certificates, competitions, current / longest streak, current level.

### 6.6 Subscriptions and invoices

**Routes:** `/me/subscriptions`, `/me/invoices`

- Active memberships (`ACTIVE` / `DUE` / `EXPIRED`)
- Renew, convert first-month settlement prepaid to quarterly when the convert flag is set
- Family seats
- Pay pending invoices (Razorpay)

### 6.7 Locations, trainers, batches, contests

| Route | What |
|---|---|
| `/me/locations`, `/:id`, `/:id/classes` | Studio branches the member can visit |
| `/me/trainers` | Trainers at the member’s studio |
| `/me/batches/:id` | Enrolled batch detail, rate the class |
| `/me/contests` | Browse open contests and register entries (parent can register children) |

### 6.8 Feed, messages, profile

Same social and chat stack as staff, scoped to the member. Profile: edit, visibility (public / private), follow requests, email, password, security. `mustChangePassword` forces `/profile/change-password` before any other route.

---

## 7. Platform admin (`/admin`)

| Route | Capability |
|---|---|
| `/admin` | List studios, create, delete, direct-login link for owners |
| `/admin/studios/new` | Provision studio + first owner |
| `/admin/studios/:id` | Edit studio metadata, suspend |
| `/admin/studios/:id/features` | Per-studio module toggles, grouped by category |
| `/admin/studios/:id/invoices` | Platform billing (`StudioInvoice`, plans `BASIC` / `ADVANCED`) |
| `/admin/profile` | System admin profile |

A suspended studio is hidden from the public marketplace together with its classes and trainers.

---

## 8. Communication (chat, feed, notifications)

### 8.1 Chat (`chat`)

- Conversation types: DM, group, batch room
- Message types: text, image, audio, poll, event (RSVP), location, system
- Envelope-encrypted at rest (`CHAT_MASTER_KEY`)
- Reactions, polls, event RSVPs
- Realtime over Socket.IO (Redis adapter)
- Batch auto-conversation is optional per batch

### 8.2 Feed (`feed`)

- Posts, likes, comments, reposts
- Follow and follow-requests (private profiles)
- Public `/users/:id` and `/posts/:id`

### 8.3 Notifications

Channels: in-app, push (FCM / Web Push), email. User preferences, quiet hours, devices, digests, deep links.

| Type | Typical trigger |
|---|---|
| `MISSED_SESSION` | Marked absent |
| `SESSION_ADDED` / `CHANGED` / `CANCELLED` | Schedule edits |
| `SUBSCRIPTION_EXPIRING` / `RENEWED` / `NOT_RENEWED` | Membership lifecycle |
| `PAYMENT_OVERDUE` / `PAYMENT_RECEIVED` | Billing |
| `NEW_FOLLOW` | Social |
| `CHAT_MESSAGE` | Chat |
| `TRAINER_PAYOUT` | Payout sent |
| `DATA_IMPORT_COMPLETE` | Import job finished |
| `STUDIO_PLAN_INVOICE` | Classa platform invoice |
| `BOOKING_REQUESTED` / `CONFIRMED` / `CANCELLED` | Booking lifecycle |
| `BOOKING_RESCHEDULE_REQUESTED` / `RESCHEDULED` | Reschedule |
| `BOOKING_REMINDER` | 24h and 2h before a trial / class / private / floor |

WhatsApp invoice-created reminders exist as an internal service, not a user-facing module.

---

## 9. Billing calendar (memberships)

Enrollment is always immediate. Billing never delays the roster seat.

After the first partial month, every invoice is a **1st-of-month prepaid**.

| Join timing | Invoice |
|---|---|
| 1st of month, or at/before the batch’s first session this month, or no sessions this month | Full-price `PREPAID_FULL` now |
| After the first session, remaining regular sessions > 0 | `PREPAID_PRORATED` = (remaining / scheduled) × plan price, payable now |
| After the first session, no sessions left | No this-month invoice; seat anyway |
| UTC day > 20 and remaining > 0 | Also create next-period `PREPAID_FULL` (optional convert-to-quarterly) |
| UTC day ≤ 20 | Next prepaid comes from the daily worker job on the 1st |

**Convert to quarterly** is offered only on that unpaid first-month settlement prepaid — not on prorated invoices, prepaid-at-join, or later renewals.

**Switch** (or unenroll then enroll a different batch the same month) keeps the current invoice. **New joiner** (first enroll, rejoin same batch, or enroll in a later month) applies the table above.

Payment methods: cash, manual UPI, Razorpay. Invoice statuses: `PENDING` → `PAID` / `OVERDUE` / `REFUNDED`. Kinds: `INDIVIDUAL`, `FAMILY`, `COMBINED`. Charge types: `POSTPAID_PRORATED`, `PREPAID_PRORATED`, `PREPAID_FULL`, `ADMISSION`.

Daily work (next-month invoices, overdue, payouts, retention rollups) runs on Cloud Run `step-up-worker` (BullMQ cron at 06:00 UTC plus catch-up on boot).

Full worked examples: [step-up-billing-calendar.md](./step-up-billing-calendar.md).

---

## 10. Staff AI agent (`ai_agent`)

Owner/staff header control → chat panel (optional voice). `POST /staff-agent/chat`. Providers: Groq, Gemini, OpenAI. Studio API key is stored encrypted on `StudioSettings`.

The agent is a CRM assistant. It must use tools; it does not invent ids. Tools:

| Tool | Purpose |
|---|---|
| `search_people` | Find students/leads by name or phone |
| `list_trial_slots` | Upcoming trial sessions |
| `list_batches` | Active batches |
| `create_lead` | New trial-caller contact (exact age in years) |
| `create_student` | Full student with login (no paid enroll) |
| `add_remark` | CRM comment |
| `book_trial` / `switch_trial` / `confirm_trial` | Trial pipeline |
| `set_active` | Archive / unarchive (needs confirm) |
| `switch_batch` | Move an enrolled student (needs confirm) |

It will not enroll into paid plans or pick subscriptions. Voice turns read back phone digits before `create_lead`.

---

## 11. Auth, accounts, and security

- Production: Firebase ID tokens. Local: `AUTH_BYPASS` / `VITE_AUTH_BYPASS` and mock bearer tokens
- Public: `/login`, `/register`, `/forgot-password`, `/join?token=` (staff invite), `/auth/action` (Firebase email actions)
- Register creates a `STUDENT` with onboarding incomplete, or a studio inquiry via contact
- Staff-created members get a temporary password shown once; next login can force `mustChangePassword`
- Staff can reset a student’s password
- PII and chat are envelope-encrypted at rest (`PII_MASTER_KEY`, `CHAT_MASTER_KEY`)
- Discover cards never list full user PII blobs — lite display fields only
- Profile visibility: public or private (follow-request gate)

---

## 12. Progressive web app

Installable PWA (Cloudflare Pages).

| Piece | Behavior |
|---|---|
| Service worker | Precaches the app shell. API, Firebase, chat, and R2 stay network-only |
| Updates | In-app “Update available / Reload” (`registerType: "prompt"`). No mid-session auto-reload |
| Offline | Cached shell + banner. Login and chat send are disabled |
| Install | Chrome/Android install; iOS Safari Add to Home Screen. Member home shows an install bar |

---

## 13. Domain map

```text
Studio
  ├── Branches (locations, media, hours, FAQs, testimonials)
  ├── Batches → Sessions → Attendance
  │     trainers, enrollments, ratings, plans, marketplace fields
  ├── Subscriptions → Memberships → Invoices
  │     individual / family packs, seats, prepaid vs first-month remaining
  ├── Bookings (trial, open seat, private, floor hire)
  ├── Leads (derived pipeline) + remarks
  ├── Expenses / recurring expenses / trainer payouts
  ├── Contests → categories → judges → entries → scores → certificates
  ├── Goals, achievements, journey events
  └── Chat, posts, follows, notifications
```

### Status machines

| Domain | States |
|---|---|
| Studio | `ACTIVE`, `SUSPENDED` |
| Batch enrollment | `ACTIVE` → `ENDED` |
| Membership | `ACTIVE`, `DUE`, `EXPIRED` |
| Invoice | `PENDING` → `PAID` / `OVERDUE` / `REFUNDED` |
| Session | `SCHEDULED` → `COMPLETED` / `CANCELLED` |
| Attendance | `PRESENT`, `ABSENT` (source: trainer / desk / QR) |
| Booking | `AWAITING_PAYMENT` → `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED` |
| Contest | `DRAFT` → `OPEN` → `CLOSED` → `COMPLETED` / `CANCELLED` |
| Contest entry | `PENDING`, `CONFIRMED`, `WITHDRAWN` |
| Trainer payout | `DRAFT` → `SENT` → `PAID` / `CANCELLED` |
| Platform invoice | `DRAFT` → `PENDING` → `PAID` / `VOID` |
| Data import | `PENDING` → `RUNNING` → `SUCCEEDED` / `FAILED` |
| Staff invite | `PENDING` → `ACCEPTED` / `EXPIRED` / `REVOKED` |
| Follow request | `PENDING` → `ACCEPTED` / `REJECTED` |

---

## 14. Architecture (short)

| App | Path | Stack | Host |
|---|---|---|---|
| Web | `apps/step-up` | React 19, Vite, TanStack Router / Query / Form / Table, `@dev-ui/*` | Cloudflare Pages (PWA) |
| API | `apps/step-up-api` | NestJS, Prisma, PostgreSQL (Neon) | Cloud Run |
| Worker | `worker.main.ts` | BullMQ processors, outbox claim (`SKIP LOCKED`) | Cloud Run `step-up-worker` |

```text
Controller → application (commands / queries) → domain → persistence
```

Payments: Razorpay + in-studio cash/UPI. Media: Cloudflare R2. Realtime: Socket.IO + Redis. Observability: Sentry. Theme id `step-up`: soft blue, larger radius, SF Pro / Inter, light + dark.

List APIs are cursor-paginated. Heavy dashboards read `BatchSummary` / `StudioRevenueSummary`. Side effects leave the transaction through `OutboxEvent`.

---

## 15. Coming soon and known gaps

- Studio settings **Notifications** and **Chat** pages are placeholders. Preferences already exist in the header notification panel and API.
- Marketplace spec F5–F9 (unified book sheet, ratings, studio controls, logged-in personalization, map + SEO) are largely implemented; the slice checklist in [step-up-public-marketplace.md](./step-up-public-marketplace.md) may lag the code.
- Goals currently support only `MONTHLY_SESSIONS`.
- Achievements are seeded definitions with JSON criteria (`SESSIONS_COMPLETED`, `STREAK`, `CONTEST_ENTRY`).
- No waitlist. No per-session trial cap across different students. No automatic refund of unused prepaid sessions after the first partial month.
- Billing calendar is UTC months (studio timezone is stored for display, not for invoice period math).

---

## 16. Related documents

| Doc | What it covers |
|---|---|
| [apps/step-up/OVERVIEW.md](../apps/step-up/OVERVIEW.md) | Product + architecture summary |
| [step-up-flows.md](./step-up-flows.md) | Payments, enrollments, user create/delete, API map |
| [step-up-billing-calendar.md](./step-up-billing-calendar.md) | When invoices are created; switch vs new joiner |
| [step-up-public-marketplace.md](./step-up-public-marketplace.md) | Marketplace contracts (search, sort, seats, book types, SEO) |
| [step-up-studio-features.md](./step-up-studio-features.md) | How to add a feature flag |
| [apps/step-up-api/ARCHITECTURE.md](../apps/step-up-api/ARCHITECTURE.md) | API layering, outbox, CQRS |
| [apps/step-up/README.md](../apps/step-up/README.md) | Local run, PWA, deploy, test gate |
