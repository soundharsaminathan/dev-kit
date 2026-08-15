# Step Up

Dance studio operations product: batches, plans, attendance, billing, retention, and booking — plus a member app for students and parents.

Tagline on the public landing page: *Dance studio operations, beautifully simple.*

This document is a product and architecture summary. Setup, testing, and API layering live in:

- [README.md](./README.md) — local dev, PWA, deploy
- [TESTING.md](./TESTING.md) and [FLOW_COVERAGE_MATRIX.md](./FLOW_COVERAGE_MATRIX.md) — test contract
- [`apps/step-up-api/ARCHITECTURE.md`](../step-up-api/ARCHITECTURE.md) — API layering, outbox, CQRS

---

## Two apps

| App | Path | Stack | Hosting |
|---|---|---|---|
| Web | `apps/step-up` | React 19, Vite, TanStack Router / Query / Form / Table, `@dev-ui/*` | Cloudflare Pages (installable PWA) |
| API | `apps/step-up-api` | NestJS, Prisma, PostgreSQL (Neon) | Cloud Run |

Auth is Firebase ID tokens in production. Local bypass uses `AUTH_BYPASS` / `VITE_AUTH_BYPASS` and mock bearer tokens. Chat and profile PII are envelope-encrypted at rest (`CHAT_MASTER_KEY`, `PII_MASTER_KEY`). Payments can be marked paid in-studio (cash / UPI) or collected via Razorpay. Media goes to Cloudflare R2. Realtime uses Socket.IO (chat, notification badges) with a Redis adapter. Background work is a dedicated BullMQ worker (`worker.main.ts`), not the HTTP process.

Theme id `step-up`: soft blue accent, larger radius, SF Pro / Inter, light + dark.

---

## Who it is for

A **studio** is the tenant. Users belong to one studio (except `SYSTEM_ADMIN`).

| Role | Shell | Job |
|---|---|---|
| **SYSTEM_ADMIN** | `/admin` | Create studios and their first users. Platform-only. |
| **OWNER** | `/app` | Full studio ops, including ownership transfer and money. |
| **STAFF** | `/app` | Same ops as owner except transferring ownership. |
| **TRAINER** | `/app` | Batches, roster, attendance, calendar, bookings, chat, payouts, retention. No student directory, catalog, invoices, or studio settings writes. |
| **STUDENT** | `/me` | Discover, book, attend, pay, chat, journey, social. |
| **PARENT** | `/me` | Same member surface, scoped to linked children (`ChildSwitcher`). |

Canonical role enum: `OWNER` · `STAFF` · `TRAINER` · `STUDENT` · `PARENT` (+ `SYSTEM_ADMIN`).

Incomplete students are gated to `/me/onboarding` until they finish the wizard (photo, experience, style, trial slot, etc.).

---

## Three shells

Routing is file-based under `src/routes/`. `beforeLoad` sends staff to `/app`, members to `/me`, and system admins to `/admin`. Guests hit `/`, `/login`, `/register`, `/join`, `/forgot-password`, or a public `/studio/$studioId` page.

### Staff app (`/app`) — run the studio

Primary tabs: Home, Batches, Trial caller (owner/staff), Messages, Profile.

| Area | Routes | What it does |
|---|---|---|
| Home | `/app` | Metrics, student funnel tiles (period), current batches, pending bookings, incomplete past sessions. |
| Batches | `/app/batches` | Create/edit/activate classes, trainers, roster, schedule, attendance tab, settings. Kids vs adults, capacity, staff-only or self-join. |
| Trial caller | `/app/leads` | Lead pipeline tabs: new, trial booked, trial attended, trial missed, converted, left, archive. Quick add, remarks, switch-trial, per-tab date presets. |
| Students | `/app/students` | Directory, import (Excel), create, per-student profile. Owner/staff. |
| Trainers | `/app/trainers` | Trainer roster and create. |
| Bookings | `/app/bookings` | Trial / open-seat / private requests; review and confirm. |
| Locations | `/app/locations` | Branches: map, gallery, FAQs, testimonials, classes at that branch. |
| Subscriptions | `/app/subscriptions` | Catalog: individual and family packs, monthly/quarterly cadence. |
| Calendar | `/app/calendar` | Studio schedule; conflict detection on the API. |
| Contests | `/app/contests` | Create contests, categories, judges, scoring. |
| Certificates | `/app/certificates` | Visual template designer (canvas + variables) and issue. |
| Invoices / Payments | `/app/invoices`, `/app/payments` | Mark paid, family combine, Razorpay, revenue views. |
| Expenses | `/app/expenses` | Categories, one-off and recurring, reports. |
| Payouts | `/app/payouts` | Trainer payout drafts from taught sessions. |
| Retention | `/app/retention` | At-risk / paid-months / occupancy style dashboards. |
| Feed / Messages | `/app/feed`, `/app/messages` | Studio social posts and encrypted chat (DMs, batch rooms, polls, RSVP events). |
| Settings | `/app/settings` | Team, branding, billing (grace / GST / platform fee), payments, dance styles. |

### Member app (`/me`) — take class

Primary tabs: Home, Discover, Messages, Profile.

| Area | Routes | What it does |
|---|---|---|
| Home | `/me` | Today timeline, next class, goals, achievements, recommended batches, notices, PWA install bar. Parents pick an active child. |
| Discover | `/me/book` | Browse/filter batches, ratings, remaining seats, book trial or enroll. |
| Bookings / checkout | `/me/bookings`, `/me/checkout/*` | Trial/private/open-seat; payment hold then confirm. Invoice checkout too. |
| Calendar / attendance | `/me/calendar`, `/me/attendance` | Personal schedule and history. |
| Check-in | `/me/check-in` | Student/parent QR check-in (parent must be linked to the child). |
| Journey | `/me/journey` | Timeline of joins, batches, streaks, contests, certificates, achievements (React Flow canvas). |
| Subscriptions / invoices | `/me/subscriptions`, `/me/invoices` | Active memberships, renew, family seats, pay. |
| Locations / trainers | `/me/locations`, `/me/trainers` | Branch pages and trainer discovery. |
| Contests | `/me/contests` | Enter contests. |
| Feed / messages / profile | `/me/feed`, `/me/messages`, `/me/profile` | Social (follow + visibility), chat, account security. |

### Platform admin (`/admin`)

Create studios (and their users) from `/admin`. Profile at `/admin/profile`. Seed login: `admin@stepup.dev` / `password`.

---

## Core domain

```text
Studio
  ├── Branches (locations, media, FAQs)
  ├── Batches → Sessions → Attendance
  │     trainers, enrollments, ratings, plans
  ├── Subscriptions → Memberships → Invoices
  │     individual / family packs, seats, prepaid vs postpaid
  ├── Bookings (trial, open seat, private)
  ├── Leads (students not yet converted) + remarks
  ├── Expenses / recurring expenses / trainer payouts
  ├── Contests, certificates, achievements, goals
  └── Chat, posts, follows, notifications
```

### Batches and attendance

A batch is a class (kids or adults) with capacity, schedule, trainers, and enrollment mode. Sessions are regular or trial. Attendance is present/absent, marked by trainer, desk, or QR. Bulk “mark all present” plus exceptions is a first-class flow. Missed sessions notify the student. Duplicate (session + student) upserts are rejected.

### Memberships and billing calendar

Subscriptions are **individual** (adult/kid) or **family packs** (2 kids, 1 adult + 1 kid, etc.). Cadence is monthly or quarterly.

Join timing drives invoices:

- **Prepaid at join** — joining on/before the first session (or the 1st) creates a prepaid invoice; membership is not granted on self-serve discover until payment.
- **Postpaid mid-month** — joining after class has started does not invoice immediately and is not treated as monthly-unpaid.
- **After the 20th (UTC)** — enroll can also create next-month prepaid.
- Staff assign/renew memberships; students purchase and renew themselves.
- Family packs allocate seats (adult vs kid) and can combine invoices.
- Switching batches keeps the existing invoice; rejoining the same batch is a new joiner. Converting prepaid-at-join to quarterly is rejected unless the convert flag is set.

Payments: cash, manual UPI, Razorpay. Invoice statuses: pending, paid, overdue, refunded.

### Booking

Types: open seat, trial, private. Statuses: awaiting payment → pending → confirmed / cancelled / completed. Capacity and schedule conflicts are enforced on the API. Discover prepaid holds a payment; postpaid can enroll now.

### Leads (trial caller)

Owner/staff pipeline for people who signed up or were added but are not yet paying members. Seven exclusive sections: **new**, **trial booked**, **trial attended**, **trial missed**, **converted**, **left**, **archive**. Each tab lists only its leads; date presets apply to the trial tabs (booked/attended/missed) only. Staff add remarks, book or switch trials, and archive/unarchive. On mobile a peeking prev/current/next header plus horizontal swipe switches tabs.

### Retention and funnel

Owner home tiles count students by period (`lifetime` / month / quarter / half-year / year) into funnel stages: signed-in only, trial attended, active, left batch. Retention dashboards use paid-months and occupancy-style rollups (scheduled analytics via the worker).

### Member experience extras

- **Onboarding** for new students.
- **Journey** timeline (XP-ish events, streaks, certificates).
- **Goals** (weekly session target) and **achievements**.
- **Social**: posts, likes, comments, follow / follow-requests, public vs private profiles.
- **Chat**: encrypted messages, reactions, polls, event RSVPs, batch rooms.
- **Notifications**: in-app, push, email; quiet hours, devices, digests, deep links (missed class, payment, chat, payout, follow).

---

## Architecture (short)

**Web** is a SPA + PWA. Service worker precaches the app shell; API, Firebase, chat, and R2 stay network-only. Updates use an in-app “Reload” prompt (`registerType: "prompt"`). Offline: cached shell + banner; login and chat send are disabled.

**API** is a modular monolith:

```text
Controller → application (commands / queries) → domain → persistence
```

HTTP and WebSocket live in `main.ts`. A separate worker claims `OutboxEvent` rows (SKIP LOCKED) and runs BullMQ processors (notifications, projections, scheduled jobs). Daily work is `POST /jobs/daily` with `x-jobs-secret` (Cloud Scheduler). List APIs are cursor-paginated. Heavy dashboards read `BatchSummary` / `StudioRevenueSummary` rather than giant includes.

PII and chat ciphertext are never listed as full user blobs on discover cards; presenters expose lite display fields.

---

## Tech map

| Concern | Choice |
|---|---|
| UI kit | `@dev-ui/components`, tokens, icons (workspace) |
| Routing / data | TanStack Router, Query, Form, Table |
| Motion / maps / QR | Motion, Leaflet, qrcode + `@zxing/browser` |
| Rich text / cert designer | TipTap; certificate canvas + variable picker |
| Journey graph | `@xyflow/react` |
| Observability | Sentry (web + Nest) |
| Auth | Firebase Auth (+ Admin SDK on API) |
| DB | Prisma + PostgreSQL (Neon) |
| Cache / queues / realtime | Redis, BullMQ, Socket.IO Redis adapter |
| Payments | Razorpay |
| Media | Cloudflare R2 (S3 API) |
| Email / push | Nest email module + FCM-style push devices |

---

## Local run (pointer)

From the monorepo root: build tokens, migrate + seed the API, then `pnpm dev:step-up-api` and `pnpm dev:step-up`. Web is http://localhost:5180.

See [README.md](./README.md) for env files, seed users (`admin@stepup.dev`, analytics owner, e2e studio), PWA QA, and GitHub Actions deploy (Pages + Cloud Run + Neon + Firebase + R2 + Sentry).
