---
name: step-up-student-screens
description: Redesigns and builds classa student/member screens (/me routes) with a modern, expressive mobile-first design — not Apple-plain minimalism — and a social-media-style feed. Use when changing student screens, member UX, mobile design, the feed, discover/booking, or any route under apps/step-up/src/routes/me.
---

# classa student screens — modern mobile design

Applies to the member surface of the classa app: `apps/step-up/src/routes/me/**` and its modules (`apps/step-up/src/modules/social/`, `modules/ui/`, `modules/layout/`, `modules/me/`). Students and parents use this surface on phones; treat mobile (390px) as the primary canvas and desktop as an expanded phone column.

## Theme

Member routes use **`step-up-soft`** (`packages/tokens/src/themes/step-up-soft.ts`). Staff `/app` stays on `step-up`. Theme switches by pathname in `apps/step-up/src/lib/theme.tsx`.

Locked palette (travel-soft / ClassPass-soft):

| Role | Value |
|---|---|
| Accent | `#8B9AF7` |
| Soft accent | `#C5CBF8` |
| Canvas | `#F5F6FB` |
| Card | `#FFFFFF` |
| Nav bar | `#2A2A35` |
| Tag mint | `--tag-mint-bg` / `--tag-mint-fg` |
| Tag lilac | `--tag-lilac-bg` / `--tag-lilac-fg` |
| Hero gradient | `--hero-gradient` |

Fonts: Plus Jakarta Sans. Radius factor ~1.4. Never hardcode colors/radii/shadows in SCSS — use tokens and the soft-tag CSS vars from `global.scss`.

## Design direction (locked by product owner)

**Modern and expressive, not Apple-plain.** Do not default to flat white cards, thin gray hairlines, and system-blue accents. This is a dance app — screens should feel energetic:

- Bold color moments: gradient heroes (`--hero-gradient`), vivid accent fills on primary CTAs, colored style badges (`apps/step-up/src/lib/dance-styles.ts`).
- Large expressive type for screen titles and hero numbers; comfortable weight contrast between title and metadata.
- Generous radius (`--radius-2xl` range) and soft elevated shadows on cards; media-forward layouts (cover images, avatars) over text-only rows.
- Depth through layering: glass (`backdrop-filter` + `--glass-*`) stays limited to sticky header and bottom tab bar; content cards use solid surfaces with elevation.
- Playful-but-cheap motion: press scale, success pulses, staggered list entrance. Keep it token-driven (see Motion below).
- Still disciplined: 8px spacing grid via `--space-*`, contrast-safe text, one primary CTA per screen.

## Screen order

1. Home `/me`
2. Feed `/me/feed`
3. Discover `/me/book`
4. Batch detail `/me/batches/$id`
5. Calendar
6. Messages
7. Attendance / Check-in
8. Bookings / Plans / Invoices / Contests
9. Profile

## Out of scope

- Do not rewrite API/domain rules unless the task explicitly adds endpoints.
- Staff `/app` screens are off-limits unless asked.
- Keep booking types (`TRIAL` / `OPEN_SEAT` / `PRIVATE`) and approval flow.

## Domain notes

- Sessions = lessons. Per-batch progress = attended `PRESENT` sessions / total sessions for an enrolled batch.
- Parent UI keeps the existing child switcher (`useActiveStudentContext`).

## Feed = social media

The feed (`apps/step-up/src/routes/me/feed.tsx` → `apps/step-up/src/modules/social/`) must read like a social app (Instagram-style), not a bulletin board:

- **Post card** (`post-card.tsx`): avatar + author name + timestamp header, **full-bleed edge-to-edge media** (no inset padding around images/video on mobile), action row (like, comment, share) below the media, caption with author name inline, tap-to-expand comments.
- Like interaction: double-tap on media triggers like with a heart burst; the like button itself gets a quick scale-pop. Optimistic update via the existing mutation.
- **Compose** (`compose-post.tsx`): floating action button or sticky affordance opening an `AppSheet` (drawer on mobile, modal on desktop), not an inline form pinned to the top.
- Infinite scroll is already wired (`useInfiniteQuery` + IntersectionObserver in `feed-page.tsx`) — keep it; add shimmer skeleton cards while loading (`SkeletonCardList`).
- Pull-to-refresh via `modules/ui/pull-to-refresh.tsx` on the feed root.
- Profile pages follow the same language: `profile-header.tsx` with avatar, stats row, and a `post-grid.tsx` media grid.

## Reuse the app primitives

Build with `apps/step-up/src/modules/ui/` and `modules/me/` first; extend a primitive rather than one-off duplicating it in a route:

| Primitive | Use |
|---|---|
| `Screen` / `page-header` | Screen scaffold, large title → compact on scroll |
| `AppSheet` | **Default overlay** for confirm/purchase/enroll/filter flows — bottom drawer on mobile, centered modal on desktop (`useIsMobile`) |
| `AppBottomSheet` | Mobile-only bottom drawer when the flow is never shown on desktop, or as the mobile branch inside a custom overlay |
| `BloomPanel` | Detail previews that bloom from a list row (bookings, home cards) — still sheet on mobile / panel on desktop |
| `PressableCard`, `TouchButton` | Tap targets ≥ 44px with token press scale |
| `BatchCard` | Class cards on Discover/booking |
| `HScrollRow` | Horizontal card carousels |
| `FilterChipRow` | Horizontal filter chips |
| `SkeletonBlock` / `SkeletonCardList` | Loading shimmer |
| `EmptyState` / `ErrorState` / `SuccessState` | Illustrated states; success gets the celebration moment |
| `PullToRefresh` | Primary lists (home, feed, messages, discover) |
| `ElasticAvatarStack`, `AnimatedMetric` | Social proof and hero numbers |

Underlying components come from `@dev-ui/*`; app wrappers exist only for product patterns.

## Overlays: drawer on mobile, modal on desktop

**Hard rule:** action sheets that appear on both breakpoints (Try 2 sessions / trial enroll, Choose a plan, Confirm booking, filters, compose, seat pickers, etc.) must use `AppSheet` — never `AppBottomSheet` alone.

- Mobile (`useIsMobile()`, `< 768px`): bottom drawer (`AppBottomSheet` under the hood).
- Desktop (`≥ 768px`): centered `Dialog` + `Modal` — not a bottom or top drawer stretched across a wide viewport.
- Do not ship a bottom drawer for these flows on desktop; it looks like a misplaced mobile sheet.
- `BloomPanel` is allowed when the open animation should morph from a list row; for plain confirm/purchase forms prefer `AppSheet`.
- Full-screen routes stay reserved for multi-step journeys (checkout), not single-confirm dialogs.

## Layout rules

- Breakpoints 390 / 768 / 1280; mobile is `max-width: 767px` (`useIsMobile`).
- Edge-to-edge content on mobile (no floating dashboard card chrome); centered column ~480–720px on desktop with the same components.
- Safe-area padding (`env(safe-area-inset-*)`) on sticky header, bottom tabs, and sticky CTAs.
- Sticky bottom CTA bar for the single primary action on booking/confirm flows.
- Overlays follow **Overlays: drawer on mobile, modal on desktop** above; full-screen routes only for multi-step flows (booking journey / checkout).

## Motion

Follow the workspace SCSS-motion rule: SCSS + tokens first (`--motion-*`, `--interaction-*`), `motion/react` only for sheet exit, shared-element hero (Discover → detail), section entrance, and success celebrations. Always gate transforms behind `useReducedMotion()` / `prefers-reduced-motion`. No comments in SCSS modules.

## Checklist per screen

- [ ] Mobile 390px design first; desktop is the same components widened
- [ ] Token-driven color/radius/shadow — nothing hardcoded
- [ ] One primary CTA; sticky when the screen has a conversion action
- [ ] Action overlays use `AppSheet` (drawer mobile / modal desktop) — no desktop bottom drawers
- [ ] Touch targets ≥ 44px; contrast checked on colored surfaces
- [ ] Loading = shimmer skeleton, empty/error = illustrated states
- [ ] Press feedback on every tappable card
- [ ] Reduced motion respected
