# classa — Public Marketplace Revamp

> **`/` is the product.** Visitors discover, evaluate, and start booking on the homepage. This is not a marketing landing page and not an MVP. Dance + Chennai + Classes is the **default first paint**, not a reduced architecture.

**Product scope is complete from day one.** Every object, booking type, category, rating, setting, and contract below is the intended product. F1–F9 are **engineering slices**, not V1/V2 product cuts. Do not interpret “implement one feature at a time” as “we will add trainers / ratings / private later.” The catalog, home, and book sheet must be designed for the full model even when a slice only ships one surface.

**Related:** [step-up-studio-features.md](./step-up-studio-features.md) · [step-up-flows.md](./step-up-flows.md) · [step-up-billing-calendar.md](./step-up-billing-calendar.md)

---

## How to use this file

1. Read [Locked product](#locked-product), [Mandatory contracts](#mandatory-contracts), and [Conflicts to migrate](#conflicts-to-migrate).
2. Implement the next unchecked [Feature](#features-build-order). That is an **execution** rule only.
3. Do not start Feature N+1 until Feature N’s **done when** is true.
4. If a behavior is not in [Mandatory contracts](#mandatory-contracts), **stop and ask**. Do not invent search, sort, seats, price, auth, cancel, or empty-state rules.

Landing-page skill (`one offer → one CTA`) **does not apply** to `/`. The product owner overrode it: `/` is a marketplace home (Playo / Airbnb / BookMyShow pattern). Visual tokens from that skill still apply to type, spacing, and motion.

---

## Locked product

### First paint

`/` → **Chennai → Dance → Classes**

Remember last **category**. When a second city is live, remember last **city**.

### Chrome (logged out and logged in)

```
Classa          City ▾
Dance | Music | Fitness | Art
Classes | Studios | Trainers
[ Search: class, studio, trainer ]
Kids · Adults · All · Beginner · Intermediate · Advanced
Today · Tomorrow · Weekend · Evening · Price · Area · Near me
```

`list | map` ships in **Feature 9**. F3–F8 are list only. Do not show a map control or a fake map.

Same discovery after login. Login only adds **enrolled**, **trial booked**, seats, child, booking state, ability to rate.

Do **not** redirect students away from `/` for discovery. Staff can still open `/app`.

### Three objects, four books

```
                    CLASSA
                       |
       +---------------+---------------+
       |               |               |
    CLASSES         STUDIOS         TRAINERS
       |               |               |
       +---------------+---------------+
                       |
                  BOOK SHEET
                       |
        +--------------+--------------+--------------+
        |              |              |              |
      TRIAL       JOIN CLASS       PRIVATE      FLOOR HIRE
                                      |              |
                                TRAINER + FLOOR   FLOOR ONLY
```

| Book | Meaning | Frequency |
|---|---|---|
| **Trial** | Upcoming session of a class | Default |
| **Join class** | Enroll in that class | Rare |
| **Private** | Trainer + floor + time | Rare |
| **Floor hire** | Room + time, no trainer | Rare, studio opt-in |

Card CTA is **Book**. Book is never a nav item. Never use **Book | Train**.

Entry point only changes preselection: class → `batchId`; trainer → `trainerId`; studio → `studioId`; private → trainer + floor; floor hire → studio + branch + slot.

### Public categories

**Dance | Music | Fitness | Art** on `/`.

Architecture is category-independent. Do **not** show swimming, martial arts, theatre, or other on public `/` until we say so. Keep them in the internal taxonomy.

- **Studio:** many categories + **one primary**. Appears under every category it actually offers.
- **Class:** **one** marketplace category, **one** level, **one or more** audiences.
- **Trainer:** **one or more** categories. Zero or many studios (staff or freelance).

### Audience and level

- Audience filter on every category: **Kids | Adults | All**
- Class / studio / trainer: kids only, adults only, or both
- Mixed: badge optional; still appears in Kids or Adults
- Level on classes: **Beginner | Intermediate | Advanced**
- Trainer level optional

### Images (per card, not studio-wide)

| Object | Missing public image | Effect |
|---|---|---|
| Studio | no valid cover | Hide from **studio** feed only |
| Trainer | no valid photo | Hide that **trainer** only |
| Class | no valid cover | Hide that **class** only |

Do **not** hide the whole studio because one trainer or class has no image. Internal records stay usable.

A **valid public studio cover** is `heroDesktopUrl` / `heroMobileUrl` or a branch cover. Do **not** treat a batch photo as the studio cover just to keep the card in the feed.

### Ratings

Two scores only: **studio** and **trainer**. Stars only. No written reviews. No testimonials-as-stars.

- Earned after an **attended** trial, completed class experience, or completed private
- Category-aware: Fitness stars do not lift Dance
- Public after **3** ratings; else **New**
- Class card may show studio and/or trainer stars, not its own marketplace score
- `BatchRating` may remain for internal class quality; it is **not** the public system

### Studio settings

```
PUBLIC VISIBILITY          BOOKING
  Studio listing    ON       Trial          ON
  Classes           ON       Enrollment     ON
  Trainers          ON       Private        OFF
  Ratings           ON       Floor hire     OFF
```

Off means hidden, not a dead button. A studio can be listed without floor hire.

### Trainers

Public index + cards + profile + book. Freelance allowed. “Teaches at…”. Studio **hire from calendar** is **ops only**, not a student tab.

### Routes

| Route | Role |
|---|---|
| `/` | Marketplace (default Classes) |
| `/classes`, `/studios`, `/trainers` | Same shell, tab selected |
| `/classes/:slug`, `/studios/:slug`, `/trainers/:slug` | Detail |
| `/chennai/hip-hop`, `/chennai/adyar` | SEO indexes only where search demand is real |

`/discover` and `/studio/:id` become aliases/redirects into this IA.

Filters stay filters. Do not invent a route per chip.

### Design

Image-first, scannable cards, real inventory on first paint, clear price / slot / area / trainer / stars, strong **Book**. Playo / Airbnb / BookMyShow **patterns**, not their brand or layout.

---

## Audit (existing system)

Inspected: Prisma schema, discover API, bookings, trial sheet, public routes, cards, ratings.

### Reuse

| Piece | Path | Use |
|---|---|---|
| Public studio cards + landing | `student-landing/studio-card.tsx`, `studio-landing.tsx` | Rebuild as marketplace listing, keep photo/trial/gallery |
| Trial sheet | `student-landing/trial-request-sheet.tsx` | Become the Book sheet (trial first) |
| Discover studio API | `GET /discover/studios`, landing, cities, trial-slots | Extend into a catalog, do not delete |
| Taxonomy | `discover.taxonomy.ts` | Keep; public `/` only exposes four category ids |
| City context | `city-context.tsx` | Remember city; live city is Chennai |
| Member `BatchCard` | `ui/batch-card.tsx` | Public class card base |
| `BookingType.TRIAL` / `PRIVATE` | `schema.prisma`, `bookings.service.ts` | Keep; change PRIVATE membership rule |
| Branch media, amenities, hours | `StudioBranch`, `BranchMedia` | Studio page + floor hire location |
| `ExperienceLevel` on User | schema | Trainer optional level; **do not** reuse as class level (`SOME_EXPERIENCE` is extra) |
| Feature flags | `StudioFeature` | Orthogonal; marketplace settings live on `StudioSettings` |

### Conflicts to migrate

Do **not** keep old behavior just because it exists.

| Current | Target | Migration |
|---|---|---|
| `/` redirects logged-in users to `/me` or `/app` | Same marketplace for members | Stop student redirect on `/`. Staff keep “Open app”. |
| `/` is brochure + Browse by style/area | `/` is inventory | Delete those sections as product structure |
| `/discover` is a second studio list; `/me/book` is auth class list | One catalog | `/discover` → `/` or `/studios`. `/me/book` uses public class cards + personal state |
| Discover category is **inferred** from `Batch.danceCategories` JSON | Class has **one** stored marketplace category; studio has explicit many + primary | Add columns + join table; backfill from classifier |
| `Batch.category` is **audience** (`KIDS` \| `ADULTS`) | Class can be kids, adults, or both | Keep `Batch.category` for existing enroll/billing. Add `classAudience` (`KIDS` \| `ADULTS` \| `BOTH`). Backfill from `category`. |
| No class level | Beginner / Intermediate / Advanced | Add `ClassLevel` on `Batch` |
| No class/trainer public slug | `/classes/:slug`, `/trainers/:slug` | Add `slug` on `Batch` and public trainer profile |
| Trainer `User.studioId` is 0..1 | 0..N studios + independent | Add `TrainerStudio`. Keep `User.studioId` as **home** studio during migrate |
| Studio rating = weighted **batch** stars | Independent studio score | New `MarketplaceRating` + `Studio.ratingAvg/Count` |
| No trainer rating | Independent trainer score | Same table, `trainerId` + `User.trainerRatingAvg/Count` |
| `BranchTestimonial` shown as social proof | Not ratings | Do not render testimonials in the rating slot |
| `PRIVATE` requires active membership | Public private (trainer + floor) | Relax membership gate when studio `bookingPrivate` is on |
| No floor hire | Room + time | Add `BookingType.FLOOR_HIRE` + `Booking.branchId` |
| `pickImageKey` falls back to batch photo | No cover → hide studio card | Change pick rule; hide if no hero/branch cover |
| Trial-slots return **all** scheduled sessions | Trial = upcoming class session | Keep listing upcoming **REGULAR** (and TRIAL) sessions as bookable trials unless a studio only uses `SessionType.TRIAL`. Document in API. |
| `/trainers/$id` → `/users/$id` | Public trainer page | Replace redirect |
| Public categories include swimming etc. in taxonomy | Four on `/` | Filter public chrome; keep taxonomy file |

### Ambiguities (recommended, not silent)

Ask if you disagree. Implementation will use these recommendations:

1. **Studio cover** = hero desktop/mobile or branch cover. Not logo-only, not batch fallback.
2. **Floor** = existing `StudioBranch` (room/location). No new Room table unless a studio has multiple halls per branch later.
3. **Class audience both** = `ClassAudience.BOTH` plus keep `Batch.category` as the enrollment default (KIDS if both, or studio-picked later).
4. **Class level** = new `ClassLevel` enum, not `ExperienceLevel`.
5. **Trainer categories** = join table (many). Public tab filters to trainers who teach that category.
6. **Rating uniqueness** = one live star per student per (studio, category) and per (trainer, category). Update allowed.
7. **Public PRIVATE** = no membership required, same as trial, when the studio enables private.
8. **SEO paths** (`/chennai/hip-hop`) wait until Feature 9. Tabs `/classes` etc. ship with the shell.

---

## Mandatory contracts

These are product law for F2 onward. They extend existing Classa behavior (seats, `BookingStatus`, parent-child, batch plans, `StudioBranch`). They do not invent a second billing or booking system.

### 1. Search

**Fields** (active category only; never leak Music into Dance):

| Object | Search these |
|---|---|
| Class | class name, style labels, studio name, trainer names, branch locality / area |
| Studio | studio name, locality / area, style labels, trainer names |
| Trainer | trainer name, styles, studio names, locality of studios they teach at |

**Matching**

- Trim, case-insensitive.
- Tokenize on whitespace. Every token must match at least one field (`AND` tokens).
- A token matches if it is a substring of a field, after stripping punctuation.
- If the query has **3+ characters** and substring match is empty, allow a second pass: `pg_trgm` / similarity ≥ `0.35` on **names only** (class, studio, trainer). Not on price or ids.
- No synonym engine. “hiphop” matching “Hip Hop” is punctuation fold, not magic.

**Zero results**

- Do not fabricate cards.
- Show the [empty state](#12-empty-and-data-quality-states) for that tab + category + city.
- Offer: clear search, clear filters, switch category only if that category has inventory in this city.

**When `q` is set**, sort is **Relevance** unless the user picked another sort.

**Relevance score** (higher first): exact name prefix > name contains > style contains > studio/trainer contains > trigram fallback. Then apply the [default marketplace tie-break](#2-sorting).

### 2. Sorting

Feeds always have an explicit `sort` query. Default when `q` is empty: **`availability`**. Default when `q` is set: **`relevance`**.

| `sort` | Meaning |
|---|---|
| `availability` | Bookable first (has a future session / slot), then nearest, then earliest next slot, then rating, then name |
| `relevance` | Search score, then `availability` tie-break |
| `nearest` | Distance km ascending. Requires lat/lng. If no geo, fall back to `availability` and show “Turn on location to sort by nearest” |
| `earliest` | Next bookable slot ascending. Objects with no future slot last |
| `price` | `priceFrom` ascending. Missing price last (not treated as ₹0) |
| `rating` | Public star avg desc, then count desc. **New** (under 3 ratings) after rated, then name |
| `popularity` | Confirmed bookings + attended trials in the last 30 days, then rating count, then name |

**Never** default to rating or popularity. First paint must surface **bookable inventory**, not the highest stars.

User-facing chips: Relevance (only when searching) · Nearest · Earliest · Price · Rating. Popularity is API-available; do not put it on the first-paint chip row.

### 3. Availability and seats

Reuse `Batch.capacity`, `BatchSummary.availableSeats`, and `assertBatchHasSeat`. Trials and privates **do not** occupy class seats (existing: `TRIAL` and `PRIVATE` excluded from seat count).

**A class is bookable for trial** when all of these are true:

- Batch `active`
- Studio `ACTIVE` and `publicClasses`
- Valid class cover
- Has a branch
- Has a schedule (`scheduleJson` or at least one session)
- Studio `bookingTrial` is on
- There is at least one `SCHEDULED` session with `startsAt > now`

**A class is bookable for join** when trial rules hold, `bookingEnrollment` is on, a public plan exists, and `availableSeats > 0`.

**Full**

- `availableSeats === 0` → card shows **Full**. Join is disabled.
- Trial stays available if a future session exists (trial does not take a seat).
- **No waitlist.** Do not add one.

**Seat copy**

- `0` → **Full**
- `1`–`5` → **`N` seats left**
- `> 5` → omit the seat line (do not show “Available” as a substitute for a number)

**Sessions**

- Public slot lists hide `startsAt <= now` and `CANCELLED`.
- Home class feed requires a next session within **35 days** (same window as today’s trial-slots).
- A class with no upcoming session can still appear on the **studio detail** page, not on the home class feed.

### 4. Pricing

Reuse batch **plans** + `billingCadence` (`MONTHLY` | `QUARTERLY`). Do not invent a new price table for classes.

| Surface | Rule |
|---|---|
| Class card | **From ₹X / month** (or `/ quarter`) = lowest **active** plan. No plan → no price on the card (never ₹0) |
| Studio card | **From ₹X** = min `priceFrom` of **visible classes in the active category** |
| Trainer card | No membership price. Private line only if private is on and a private price exists |
| Class detail | List each public plan exactly (name, cadence, amount) |
| Trial | **Free request.** Studio confirms. No payment hold (existing). Do not add a trial SKU in F2–F5 unless a studio setting `trialFee` is added later |
| Private | `StudioSettings.privateSessionPaise` + `privateSessionMinutes` (default 60). Optional override on `TrainerStudio`. Card/sheet show that exact slot price |
| Floor hire | `StudioSettings.floorHirePaise` + `floorHireSlotMinutes` (default 60), or per-branch override later. Exact slot price. Toggle off → no price, no CTA |
| Currency | INR, existing formatters |

**Starting from vs exact:** marketplace cards always **From** for membership. Private and floor hire are **exact** for the selected duration.

Price is **per class plan**, not per category. The Dance tab does not show a Fitness plan.

**Follow-up schema (still Feature 1 contract, apply before F5):** `privateSessionPaise`, `privateSessionMinutes`, `floorHirePaise`, `floorHireSlotMinutes` on `StudioSettings`. `privateSessionPaise` / minutes optional on `TrainerStudio`.

### 5. Authentication and who is booked

Reuse existing trial sheet + `ParentChild`. **No OTP product.**

| Step | Logged out | Logged in |
|---|---|---|
| Browse, search, open cards | Yes | Yes |
| Open Book sheet, pick slot | Yes | Yes |
| Submit booking | Must register or sign in (email+password or Google) | Submit |

After register, user is a **STUDENT** (existing). Then create the booking.

**Children**

- “This is for my child” (existing) creates or selects a linked child.
- One parent account may manage **many** children (`ParentChild`).
- Bookings store `studentId` = the child when the toggle is on.
- A parent rates on behalf of that child (existing rating actor rule).

Do not allow booking for an unlinked student id.

**Child × audience** — block mismatches. Discovery stays filter-driven; booking is strict. Enforce on **submit** in the sheet and again server-side. Do not hide Adults classes from a parent who is browsing All or Adults.

| Booked for | Class audience | Result |
|---|---|---|
| Child | `KIDS` or `BOTH` | Allow |
| Child | `ADULTS` | Block: “This class is for adults only” |
| Adult (self) | `ADULTS` or `BOTH` | Allow |
| Adult (self) | `KIDS` | Block: “This class is for kids. Book with a child profile.” |

### 6. Booking, payment, cancel, reschedule

Do **not** add a new status enum. Map the marketplace words onto existing `BookingStatus`:

| Marketplace word | `BookingStatus` |
|---|---|
| Selected (sheet only) | not persisted |
| Pending payment | `AWAITING_PAYMENT` (10 min hold, existing `PAYMENT_HOLD_MS`) |
| Paid / confirmed | `CONFIRMED` after pay, or after studio accept when no pay |
| Waiting for studio | `PENDING` (trial, or ₹0 private/floor) |
| Attended | attendance `PRESENT` on that session |
| Completed | `COMPLETED` after the slot ends |
| Cancelled | `CANCELLED` (includes expired payment holds) |

**Per type**

| Type | Pay | First status | Confirm |
|---|---|---|---|
| Trial | Never | `PENDING` | Studio / staff confirms → `CONFIRMED` |
| Join | Existing invoice / checkout ([step-up-flows.md](./step-up-flows.md)) | existing enroll path | Membership + invoice rules |
| Private (price > 0) | Razorpay hold | `AWAITING_PAYMENT` | Pay → `CONFIRMED` |
| Private (₹0 or unset) | No | `PENDING` | Studio confirms |
| Floor hire (price > 0) | Razorpay hold | `AWAITING_PAYMENT` | Pay → `CONFIRMED` |
| Floor hire (₹0) | No | `PENDING` | Studio confirms |

**Cancel** (extends `cancelBooking`)

- Student or parent: `PENDING` or `CONFIRMED`, if start is in the future.
- Studio staff: any future `PENDING` / `CONFIRMED` / `AWAITING_PAYMENT`.
- Trial: no refund (free).
- Paid private / floor: **full refund** if cancelled **≥ 12 hours** before `startsAt`. After that, no automatic refund. Studio-initiated cancel always full refund.
- Join / membership: existing staff invoice refund only. Marketplace cancel of a trial does not unenroll.

**Trainer cancel / trainer absent** — no separate trainer-cancel status. Trainer has **no** public student-facing cancel. Trainer marks unavailable; staff (or system acting for the trainer) cancels in ops. Marketplace treats that as **studio-initiated**.

| Case | What happens |
|---|---|
| Private (paid or ₹0) | Booking → `CANCELLED`. Paid: **full refund** always (same as studio cancel). ₹0 / `PENDING`: cancel only. Notify student (and parent if child): cancelled by the studio/trainer, with time + trainer name. |
| Class session dropped / trainer absent | This is a **session cancel**, not a per-booking student cancel. Studio/ops sets `Session` to `CANCELLED`. All `PENDING` / `CONFIRMED` trials on that `sessionId` auto-move to `CANCELLED`. Notify each booker (parent if child). Copy: “Your trial for {Class} on {date/time} was cancelled by {Studio}. Book another time from the class page.” No refund. Join / membership is untouched. |

**Studio cancels a session with many confirmed trials** — auto-cancel, then notify. Do not only notify (cards would still show trial booked, reminders would fire, rating eligibility would stay wrong).

1. Bulk-cancel trial bookings for that `sessionId` in `PENDING` or `CONFIRMED`.
2. Fire cancelled notification per booker (parent if child).
3. Personal card state (trial booked) clears on the next catalog fetch.
4. Leave Join / membership alone.
5. “Pick another session” deep link is optional later.

**Confirmation** after first book is **in-sheet**, then durable My bookings — not email-only.

1. Book sheet success: type, class/studio/trainer, time, branch, status (Waiting for studio / Confirmed / Pay…).
2. Primary CTA: **View booking** → `/me/bookings`. Secondary: **Back to class** / marketplace.
3. Email and in-app notification mirror the same facts; they are backup.
4. Logged-out → register/sign-in → create booking → same success sheet.

**Reschedule** (extends `requestReschedule`)

- Student/parent: one request on `CONFIRMED` or `PENDING`; new slot must pass the same availability rules.
- Studio may move the booking to another open slot.
- No automatic fee.

**No-show**

- No `NO_SHOW` status.
- After `startsAt`, student cancel is closed.
- Attendance `ABSENT` is the no-show record. No automatic refund.

### 7. Branches and locations

Reuse `StudioBranch`. **One `Batch` = one branch.** Do not let one class span branches. Same name at two floors = two classes.

| Rule | Behavior |
|---|---|
| Studio card | **One card per studio**, not per branch. Locality + km = **nearest branch** that has inventory in the active category |
| Distance | Haversine from user/origin to that branch |
| Class card | Branch locality of `Batch.branchId` |
| Floor hire | The selected **branch** is the floor |
| Studio page | List branches. Group classes and floor hire by branch |
| Map marker | **One marker per branch** that has public inventory for the current tab + category |
| Near me denied | Keep city filter, drop `nearest` sort, copy: “Showing Chennai. Enable location to sort nearby.” |

### 8. Trainer and class schedule conflicts

**Class sessions** stay the source of truth for group classes (`Session`).

**Private / floor** must not overlap:

- The trainer’s other `CONFIRMED` / `PENDING` / live `AWAITING_PAYMENT` privates
- The trainer’s class sessions (`Session.trainerId` or `BatchTrainer` sessions)
- The branch’s other floor-hire bookings in the same interval
- Branch `openingHours` (closed = not bookable)

**Trainer availability** (add with F5, designed now):

- `TrainerAvailability`: weekday + start + end (home defaults)
- `TrainerBlock`: start/end datetime (time off)
- Default private duration: `privateSessionMinutes` (60)
- **Buffer: 15 minutes** after every private and class the trainer teaches
- Same trainer, two studios, same day: **allowed** if intervals + buffer do not overlap. Do not invent travel time.

A class **may** have many trainers (`BatchTrainer`). Card shows `sortOrder` first. A class **may** have zero trainers; hide the trainer line; trial still works.

A trainer may teach at many branches via many classes. They cannot teach the **same batch row** at two branches.

### 9. Relationships (public behavior)

| Question | Lock |
|---|---|
| Multiple trainers on one class? | Yes |
| Same class row at multiple branches? | No |
| Same trainer, same class name, two branches? | Yes, as two batches |
| Class with no trainer? | Yes |
| Studio with no class, trainers only? | Yes, if Trainers visibility is on |
| Independent trainer, no studio? | Yes; private needs a bookable floor (a studio with private + an open branch) |

### 10. Map

- List and map show the **same** result set and sort.
- Marker = branch (studio name + area). Class tab: only branches with a matching class. Trainer tab: branches they teach at.
- Cluster when zoomed out (city). Expand on zoom.
- Click card → select marker and pan. Click marker → select card and scroll it into view.
- Distance as in [§7](#7-branches-and-locations).

### 11. Empty and data-quality states

**Empty copy** (do not show a generic “No results” for every case):

| State | Copy |
|---|---|
| Category has no live objects in this city | “Dance classes in Chennai are coming soon.” (swap names) |
| Tab empty but other tabs have data | “No trainers in Fitness in Chennai yet. Browse classes or studios.” |
| Filters/search empty | “No classes match these filters.” + Clear filters / Clear search |
| City not live | Existing coming-soon city picker |

**Class reaches a public feed** only if: cover, active, studio listed + `publicClasses`, branch, schedule, marketplace category matches tab, and (for **home class feed**) a session in the next 35 days.

**Still allowed on studio detail, not home feed:** no upcoming session.

**Allowed on home feed with omissions:** no price (omit ₹), no trainer (omit name), no public stars (**New**).

**Not allowed on any public feed:** no cover / photo (per-object image gate), studio `SUSPENDED`, visibility toggle off, wrong category.

**Studio home feed:** cover + `publicStudioListing` + appears in this category (explicit `StudioMarketplaceCategory`) + at least one public class **or** public trainer in that category.

**Trainer home feed:** photo + at least one category match + (`TrainerStudio` to a listed studio with `publicTrainers` **or** independent with private bookable).

### 12. Notifications

Reuse `Notification` + existing channels. Fire these; add `NotificationType` values if missing:

- Booking requested (`PENDING`)
- Payment received / hold expired
- Booking confirmed
- Trial reminder (24h and 2h before)
- Class / private / floor reminder (same)
- Cancelled (student or studio; includes trainer-absent / session cancel treated as studio-side)
- Reschedule requested / accepted

Do not build a new comms stack in F2.

### 13. SEO

| URL | Index | Title pattern |
|---|---|---|
| `/` and tab aliases | yes | `Dance classes in Chennai` (category + city + tab) |
| `/classes/:slug` | yes | `{Class} · {Studio} · {Area}` |
| `/studios/:slug` | yes | `{Studio} · {Area} · {Primary}` |
| `/trainers/:slug` | yes | `{Trainer} · {Category} in {City}` |
| Filter-only query URLs | noindex, canonical to clean tab URL | — |
| Empty city/category | noindex until inventory exists | — |

Every indexed page: meta description (one sentence, inventory-specific), canonical, `og:image` = cover/photo, JSON-LD `LocalBusiness` (studio) or `Event`/`Course` (class) where it fits. No duplicate `/discover` and `/` both indexed — `/discover` 301.

**Slugs**

- Collision on create / backfill: **numeric suffix**, not a studio prefix. `hip-hop-beginners`, then `hip-hop-beginners-2`. Same rule for studio and trainer slugs. Reuse `uniquifySlug`.
- Rename: new slug is canonical. Persist `SlugRedirect` (old → new, object type). Old `/classes/:slug`, `/studios/:slug`, `/trainers/:slug` **301** to the current slug.
- Do not 404 old slugs. Do not keep two indexed URLs — `rel=canonical` is the current slug only.

### 14. Analytics

Event names (do not rename):

`marketplace_search` · `marketplace_filter` · `marketplace_sort` · `marketplace_category` · `marketplace_city` · `marketplace_tab` · `card_impression` · `card_click` · `book_click` · `booking_started` · `booking_completed` · `trial_booked` · `studio_viewed` · `trainer_viewed` · `class_viewed`

Payload: `{ object, id, category, city, tab, q? }`. Wire in F3+; do not block F2 API on analytics.

### 15. Admin / moderation

- `Studio.status = SUSPENDED` already hides the studio and its classes/trainers from public feeds. Use that for bad listings.
- System admin can turn off a studio’s public listing flags.
- Duplicate studio/trainer: do not auto-merge in this revamp. Admin hides one.
- Rating abuse: delete that `MarketplaceRating` row and recompute aggregates. Student can be blocked from rating by staff later; not required for F6.
- Wrong photos: studio edits; admin can suspend if they refuse.

### 16. Derived locks (2026-09-20 audit)

These close gaps that were already implied by existing contracts or existing booking code. They are product law. Do not re-invent them in F4–F5.

**Home chrome**

- First-paint audience is **All** (no `audience` query). Kids and Adults are toggles. All clears the filter.
- Today / Tomorrow match the object’s **next bookable timestamp** in the visitor’s local calendar day (`nextSessionAt` / `nextTrialAt` / `nextClassAt`). They are not `scheduleJson` pattern matches.
- Weekend → `days=weekend`. Evening → `time=evening`. Those hit the catalog API (schedule window), not the next-session day filter.
- Near me requests geolocation, then `sort=nearest`. Denied or missing geo: keep city, do not apply nearest, show “Turn on location to sort by nearest”.
- `list | map` is **hidden until F9**. §10 Map still stands; F3 does not ship a map control.

**Full × Book**

- Card CTA stays **Book**.
- `availableSeats === 0` shows **Full**. If `canTrial`, also show **Trial open**. Book stays enabled and opens trial.
- Join is disabled when Full. Do not rename Book to Trial.

**Detail Book with no upcoming session**

- Class on studio detail with no future `SCHEDULED` session: hide Book (not a dead button). The class can still render.
- Home class feed never shows that class (35-day window already).

**Studio / trainer card Book (until F5)**

- Class card Book → trial, `batchId`.
- Studio card Book → trial for that studio (no batch preselect). Floor hire is **not** a home-card action; it is studio detail only (F7).
- Trainer card Book → trial if a class + studio resolve; otherwise do not open a private sheet until F5.

**Trials (existing `createBooking`)**

- Trials do **not** take class seats. There is **no per-session trial cap** across different students.
- One live trial per `(sessionId, studentId)`: reject if that student already has `PENDING`, `CONFIRMED`, or a live `AWAITING_PAYMENT` hold on that session.
- Parent + child are different `studentId`s, so both may hold a trial on the same session.
- Cancelled trial may be rebooked on the same session. No extra rate limit.
- `PENDING` trial on a session blocks a second trial from that same `studentId` only.

**Join eligibility (marketplace-facing; pay/enroll detail stays in [step-up-flows.md](./step-up-flows.md))**

- Join requires the trial-bookable rules + `bookingEnrollment` + public plan + `availableSeats > 0`.
- Already enrolled in that batch: do not open Join. Card shows enrolled (F8); Book opens trial only if a trial is still allowed, else the sheet is manage/membership — **do not start a second enroll**.
- Active membership on another batch does not block Join on this batch.
- Trial `PENDING` / `CONFIRMED` on this batch does **not** block Join.
- Expired membership re-join uses the existing enroll path in `step-up-flows.md`.

**Private floor ownership**

- Student picks the floor among **attached** studios (`TrainerStudio`) that have `bookingPrivate` on and at least one open branch.
- If the trainer has several attached private-on studios, the sheet lists those studios / branches. There is no “home studio only” default that hides the others.
- If the only attached studio has `bookingPrivate` off: private is hidden. Floor hire on that studio does not substitute.
- Freelance private **requires** a `TrainerStudio` row to that floor’s studio. A public trainer cannot use an arbitrary studio that turned private on.
- Independent with no `TrainerStudio` and no private-on attached studio: trainer may still appear if the independent+private-bookable feed rule holds **and** a floor can be completed; if no attached private floor exists, hide Private (they can still Trial via a class).

**Slot hold**

- Selecting a slot does **not** persist a hold.
- Hold starts when the paid private/floor row is created as `AWAITING_PAYMENT` (`PAYMENT_HOLD_MS`, 10 min).
- Live `AWAITING_PAYMENT` blocks the same trainer/branch interval (existing overlap rule). A second user must not see that hour as free.
- Expired hold → `CANCELLED`; the interval is free immediately.

**Ratings**

- `CLASS` source: first `PRESENT` attendance on an enrolled class session in that category (not membership end, not “N sessions”).
- Uniqueness is per booked **`studentId`** (child), studio, and category — not per parent login.
- Stars on cards are for the **active category**, not the studio’s primary only.

**Book sheet types (F5 UI)**

- Default type = **Trial** when valid.
- Types appear as a **list** of available types (not tabs). Hidden types are omitted, not disabled.
- Floor hire is listed only on studio detail, never from home chrome or studio-card Book.

**Stars / price**

- Unset `privateSessionPaise` → request flow (`PENDING`), no exact rupee on the card.
- Quarterly plans show `/ quarter`, never as `/ month`.

**Trainer cancel / session cancel / child audience / confirmation / slugs** — see §5, §6, and §13. Nothing in that set is still open.

---

## Features (build order)

**Product = all contracts above. Implementation = F1–F9.** F2 must encode search, sort, seats, price-from, image/data gates, and empty DTO flags. F3 must encode empty states and default `availability` sort. F5 must encode pay/cancel/reschedule and trainer conflicts. Do not “simplify” a contract because the current slice is Classes-only.

This split is **vertical where users feel it**, and **complete in the contract** so we never design a Dance-only model.

```
F1 Contract          schema + settings + types     (architecture complete)
F2 Catalog API       classes / studios / trainers  (image gates + filters)
F3 Marketplace home  `/` chrome + three feeds      (inventory on first paint)
F4 Detail pages      class / studio / trainer
F5 Book sheet        trial · join · private · floor
F6 Ratings           write + public stars
F7 Studio controls   settings UI + hire-trainer ops
F8 Same-home login   personal card state
F9 Place + SEO       map, time rail polish, city/style URLs
```

### Feature 1 — Marketplace contract

**Status:** Done. Both F1 migrations applied. Classifier backfill ran. Contract helpers and tests cover search, seats, sort, ratings-per-category, and freelance trainers.

**Goal:** The database and shared types already describe the full product. No UI requirement except not breaking current discover.

**Add (Prisma)**

- `MarketplaceCategory`: `DANCE` `MUSIC` `FITNESS` `ART`
- `ClassLevel`: `BEGINNER` `INTERMEDIATE` `ADVANCED`
- `ClassAudience`: `KIDS` `ADULTS` `BOTH`
- `BookingType.FLOOR_HIRE`
- `MarketplaceRatingTarget`: `STUDIO` `TRAINER`
- `MarketplaceRatingSource`: `TRIAL` `CLASS` `PRIVATE`
- `StudioSettings`: eight public/booking booleans (defaults as locked)
- `Studio`: `primaryCategory`, `ratingAvg`, `ratingCount`
- `StudioMarketplaceCategory` (studioId, category, unique)
- `Batch`: `marketplaceCategory`, `classLevel`, `classAudience`, `slug`
- `TrainerStudio` (trainerId, studioId, isHome)
- `TrainerMarketplaceCategory`
- `User`: `publicSlug` (nullable, unique), `trainerRatingAvg`, `trainerRatingCount`
- `MarketplaceRating` (student, target, studio/trainer, category, stars, source, attendedAt)
- `Booking.branchId` optional (floor hire / private floor)

**Backfill**

- Studio categories from existing discover classifier on active batches; primary = most common
- Batch `marketplaceCategory` from first classified style, else `DANCE`
- Batch `classAudience` from `Batch.category`
- `TrainerStudio` from `User.studioId` where role is TRAINER (`isHome` true)
- Trainer categories from `User.styles` / trained batches
- Slugs from unique slugify(name) + numeric suffix (`uniquifySlug`)

**In tree**

- [x] Enums and models in `schema.prisma`
- [x] Migration `20260920154500_marketplace_contract`
- [x] Contract helpers + tests: `src/discover/marketplace.contract.ts`
- [x] `FLOOR_HIRE` + `branchId` on booking create DTO / service persist
- [x] Private/floor prices, trainer availability/blocks, booking notification types
- [x] Classifier backfill (`marketplace.backfill.ts` + `devtool:backfill-marketplace`)
- [x] Apply both F1 migrations on the dev database
- [x] Run `pnpm --filter @step-up/api devtool:backfill-marketplace` after migrate

**Tests:** unique slugs; freelance trainer with zero `TrainerStudio`; studio in two categories; rating unique per category.

**Done when:** `prisma migrate` applied, generate succeeds, existing discover and bookings tests still pass.

### Feature 2 — Catalog API

**Status:** Done. `GET /discover/classes`, `/trainers`, class/trainer detail, and marketplace `GET /discover/studios` (uppercase category / `sort` / `level`) return `{ items, empty, sort, category, city, tab }`. Legacy lowercase `category=dance` still returns a studio array. Image gates, search tokens, availability sort, seat copy, and missing-price-last live in the query layer.

**Goal:** One public query language for all three objects.

```
GET /discover/classes
GET /discover/studios   (extend)
GET /discover/trainers
GET /discover/classes/:idOrSlug
GET /discover/trainers/:idOrSlug
```

Filters (all inside active category): `city`, `q`, `audience`, `level`, `days`, `time`, `locality`, `lat/lng/maxKm`, `maxPrice`, `limit`.

**Image gates in the query**, not the client:

- Classes: require `coverImageUrl` and `settings.publicClasses` and studio ACTIVE
- Studios: require valid cover and `settings.publicStudioListing`
- Trainers: require `photoUrl` and (studio `publicTrainers` or independent live)

Honor booking/visibility flags in the DTO (`canTrial`, `canEnroll`, `canPrivate`, `canFloorHire`).

Logged-in optional viewer state: enrolled, trial booked, remaining seats (do not require it for the feed to work).

**Reuse:** `discover.service.ts` list/detail, cities, localities, signed media URLs.

**In tree**

- [x] Query/sort/gate helpers: `src/discover/marketplace-catalog.query.ts`
- [x] Catalog service: `src/discover/marketplace-catalog.service.ts`
- [x] Controller wiring for classes / trainers / marketplace studios + detail
- [x] Frontend fetchers: `apps/step-up/src/modules/marketplace/`
- [x] Tests: image hide, category isolation, Kids, coverless batch keeps studio, search tokens, zero-result empty, availability sort, seats 0 / 1–5 / >5, missing price last

**Done when:** HTTP tests cover image hide, category isolation, Kids filter, coverless batch not hiding the studio, **search tokens**, **zero-result empty**, **availability sort** (bookable first), **seats 0 / 1–5 / >5**, and **missing price last** on price sort. Do not invent a different sort or seat rule.

### Feature 3 — Marketplace home

**Status:** Done. `/` is the class feed (Dance · Chennai first paint). `/classes` `/studios` `/trainers` share the chrome. `/discover` 301s to `/studios` with the same filters. Brochure Browse-by-style/area is gone. Class **Book** opens the existing trial sheet.

**Goal:** `/` is the inventory.

- Replace brochure sections. **No** Browse by style / area / category / How it works as structure
- Category + object tabs + search + audience/level chips
- Default Dance · Chennai · Classes
- Remember category
- Three image feeds from Feature 2
- **Book** on class cards opens trial (existing sheet wired to `batchId`)
- `/classes` `/studios` `/trainers` share the shell
- `/discover` redirects to `/` or `/studios` with the same search

**Reuse:** `PublicShell`, city switcher, `StudioCard` / `BatchCard` restyled.

**In tree**

- [x] Marketplace chrome + three feeds: `src/modules/marketplace/home.tsx`
- [x] Image-first class / studio / trainer cards with **Book**
- [x] `/`, `/classes`, `/studios`, `/trainers` share search + category memory
- [x] `/discover` redirects to `/studios` with mapped filters
- [x] Students are not bounced off `/`; staff keep Open app
- [x] Brochure Browse by style / area / How it works removed from `/`

**Done when:** a logged-out visitor sees class image cards and can start a trial without visiting `/discover`. Music / Fitness / Art tabs exist even if empty.

### Feature 4 — Detail pages

- [x] `/classes/:slug` — schedule, next session, seats, price, studio, trainer, Book
- [x] `/studios/:slug` — photo tour, map, hours, amenities, categories, audience, stars, classes, trainers, booking options, floor hire if on. Marketplace listing, not `/app`
- [x] `/trainers/:slug` — photo, categories, studios, classes, next slot, stars, Book (trial or private)
- [x] Redirect `/studio/:id` and `/trainers/:id` → new slugs
- [x] `SlugRedirect` + **301** old public slugs; collision = numeric suffix (`uniquifySlug`)

**Status:** Done. Old ids and renamed slugs resolve through `SlugRedirect`; the public page replaces to the canonical slug (`rel=canonical` is the live slug only). Class → studio → trainer links stay on `/classes`, `/studios`, and `/trainers`.

**Done when:** class → studio → trainer → back to class never leaves the marketplace.

### Feature 5 — Unified book sheet

One sheet, four types, settings-gated.

- Trial: existing `POST /bookings` TRIAL + onboarding register
- Join: existing enroll / checkout
- Private: trainer + `branchId` + time; **no membership** if `bookingPrivate`
- Floor hire: `FLOOR_HIRE` + `branchId` + time; no trainer
- Child × audience gate on submit + server
- Success state in-sheet, then **View booking** → `/me/bookings`
- Session cancel bulk-cancels trials; trainer cancel = studio-initiated

**Done when:** class, studio, and trainer Book all open the same sheet; private and floor hire work when toggles are on and are hidden when off.

### Feature 6 — Ratings

- `POST /discover/ratings` (auth): studio or trainer, category of the visit
- Eligibility: completed attendance / trial / private
- Aggregate + hide until 3
- Prompt after attendance
- Cards and detail pages
- Stop showing testimonial stars as ratings

**Done when:** a student cannot rate a studio they never attended; a Fitness rating does not change Dance stars.

### Feature 7 — Studio controls and trainer hire

- Settings UI for the eight toggles
- Alerts for missing covers/photos (per object, not whole-studio draft)
- Ops: attach freelance trainer to studio from calendar availability (`TrainerStudio`)

**Done when:** turning Trainers off hides trainer cards for that studio; turning Floor hire on shows it on the studio page only.

### Feature 8 — Logged-in personalization

- Students stay on `/` marketplace
- Cards: enrolled, trial booked, seats, your child
- Rate last class
- `/me/book` is the same class feed

**Done when:** login does not change the IA.

### Feature 9 — Map and SEO

- Time rail polish, list | map
- `/chennai/hip-hop`, `/chennai/adyar` where useful
- Remember city when the second city is live

**Done when:** a shared URL opens the same category + city + tab + filters.

---

## Suggested work inside a feature

1. Schema / API
2. Tests (including a **negative** path: hidden image, disabled booking, wrong category)
3. UI
4. Redirects / aliases so old URLs do not 404

One feature per PR. Do not rebuild all of `/` in one diff.

---

## Current public spine

`/` · `/classes` · `/studios` · `/trainers` share `MarketplaceHome`. `/discover` redirects to `/studios`. Brochure browse/how-it-works is gone. FAQ can live in footer or `/help`.

---

## Decisions log

| Date | Decision |
|---|---|
| 2026-09-20 | `/` is the marketplace, not a landing page |
| 2026-09-20 | Classes / Studios / Trainers; never Book / Train |
| 2026-09-20 | Four public categories; first paint Dance · Chennai · Classes |
| 2026-09-20 | Trial default; private = trainer + floor; floor hire = room only |
| 2026-09-20 | Freelance trainers; hire is ops |
| 2026-09-20 | Image hide is **per card**, not whole-studio draft |
| 2026-09-20 | Stars only; studio + trainer; category-aware; visible at 3 |
| 2026-09-20 | Same home logged in and out |
| 2026-09-20 | Feature split revised after codebase audit (this file) |
| 2026-09-20 | Product scope complete; F1–F9 are execution slices only |
| 2026-09-20 | Locked search, sort, seats, pricing, auth/children, booking lifecycle, branches, schedule conflicts, empty/data-quality, map, notifications, SEO, analytics, moderation |
| 2026-09-20 | Audit locks: All default; list-only until F9; Full + Trial open; trial duplicate per student+session; private floor = attached `TrainerStudio` + `bookingPrivate`; hold = `AWAITING_PAYMENT`; `CLASS` rating = first PRESENT; uniqueness per `studentId` |
| 2026-09-20 | Trainer cancel = studio-initiated (full refund if paid). Session cancel auto-cancels trials then notifies. Child × audience blocked on submit. First-book success is in-sheet then `/me/bookings`. Slug collision = numeric suffix; rename 301 via `SlugRedirect`. |
