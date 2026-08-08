---
name: step-up-boot-perf
description: >
  Strict Step Up web boot, LCP, TBT, and provider-tree rules from Phase 4
  (/app Lighthouse work, PR #13). Use whenever changing apps/step-up startup,
  auth boot, theme/toast/session providers, public shells (#boot-public),
  /app or /me first paint, deferred chunks, router invalidate, or Lighthouse
  performance. Treat every rule as mandatory unless the user explicitly
  overrides it.
paths:
  - apps/step-up/**
---

# Step Up boot & LCP — strict rules

Read this skill **before** editing Step Up boot, providers, shells, or home
first-paint UI. These are hard constraints learned from Phase 4 regressions.
Do not “simplify” them away for elegance.

Targets for primary routes (`/`, `/login`, `/app`, `/me`):

| Metric | Limit |
| ------ | ----: |
| LCP | ≤ 2.5s |
| TBT | ≤ 200ms |
| Performance | ≥ 90 |
| CLS | ≤ 0.10 |

See [references/phase4-lessons.md](references/phase4-lessons.md) for measured
before/after and failure modes.

## 1. Provider tree — never remount the outlet

**Rule:** After the authenticated (or public interactive) outlet has painted,
do **not** change the React component type wrapping `<Outlet />` / route
children. Swapping wrappers remounts forms and wipes local UI state (e2e +
users).

| Concern | Mandatory pattern |
| ------- | ----------------- |
| Toast | Keep a **stable** `ToastContext.Provider` for the tree lifetime. Mount the real visual toast host as a **sibling** once the chunk loads. Never replace `ToastContext` with a different provider type mid-session. |
| Theme (protected) | Do **not** paint the protected outlet under temporary `IconProvider` and later swap to `AppThemeProvider`. Hold `AuthBootLoader` until `AppThemeProvider` is ready, then mount children **once**. Admin/`useTheme` depends on this. |
| Theme (public) | Idle-hydrate `AppThemeProvider`. Public children may render before theme JS; do not gate public interactivity on theme chunk forever. |
| Session sockets/push | Defer past first paint. If the outlet already painted **bare**, mount `SessionProviders` as a **sibling** (`{null}` children) — never wrap the live outlet later. |
| Studio brand | `StudioBrandProvider` **must** sit under **both** `ThemeProvider` and `QueryProvider` (typically inside `SessionProviders`). Never lift it into `AppThemeProvider` above `QueryProvider` — that crashes with `No QueryClient set` when theme remounts on `/login`. |

Canonical order (simplified):

```text
BootThemeProvider → AppThemeProvider
  QueryProvider
    SessionGate → SessionProviders (StudioBrandProvider, sockets)
      DeferredToastProvider (stable ToastContext + sibling host)
        Outlet
```

## 2. Public boot shell (`#boot-public`)

**Rule:** Static HTML owns early LCP on `/` and `/login`. React mounts
underneath; dismiss the shell without deadlocks.

- Do **not** block `mountApp()` forever on async CSS for public routes.
  Protected CSS wait must be **bounded** (seconds, not indefinite).
- Login dismiss mode is **interact** so the static shell remains the LCP
  candidate under throttle; landing may use **idle**.
- When `VITE_AUTH_BYPASS=true` (e2e), dismiss immediately so Playwright is not
  stuck behind `#boot-public`.
- E2E `waitForAppReady` may nudge dismiss (e.g. body click); app code must
  still dismiss on real user interaction / bypass.
- Avoid chicken-and-egg: tests must not require `#boot-public` gone before any
  interaction if dismiss is interaction-gated — either bypass-dismiss or nudge.

## 3. Entry / main-thread budget

**Rule:** Keep Firebase, Sentry, lucide pack, ThemeProvider/colorjs, toast/motion,
and non-critical sockets **off** the public critical path.

- Public: idle-defer Firebase parse/eval and heavy providers.
- Protected: preload theme + toast **while** `AuthBootLoader` is up; do not
  gate first protected shell paint on toast/motion readiness (use noop toast
  API until the host loads).
- Prefer empty/cached icon packs on first paint; idle-preload lucide.
- Login password show/hide must work **without** `Icon` / IconProvider
  (text toggle). Icons on that path previously crashed boot and skewed LCP.
- Do not re-introduce `@dev-ui/components/styles` barrel or large GIF loaders
  on the boot path; keep CSS marks / step-up token CSS.

## 4. Auth settle & router

**Rule:** Skip `router.invalidate()` on the **first** auth settle. Invalidate
only when the signed-in user **changes**. First-load invalidate remounts the
active route and races `preloadRoute`, wiping in-progress UI (critical e2e).

- Do not unmount `RouterProvider` while warming providers on `/login` — that
  cancels post-login navigation to `/app`.
- Only block the shell on **protected** paths for theme readiness; public
  paths stay mounted.

## 5. LCP ownership on `/app` and `/me`

**Rule:** Early shell text (boot loader / screen title) must remain the LCP
element. Late API copy must not steal LCP under mobile throttle.

Forbidden on first viewport / LCP path:

- Oversized hero titles/subtitles that outsize the auth boot loader (late
  shell commit becomes LCP at ~8s).
- Long secondary strings from slow queries (booking row meta, funnel hint
  paragraphs, pending list bodies). Prefer compact summaries; put detail in
  `aria-label` or below-fold sections.
- Late-loading images as LCP candidates on home (defer banner/cover images
  off the critical home path).
- Non-critical widgets on OWNER `/app` first paint — lazy-load trainer
  banner/bloom, booking drawers, etc.

Required:

- Keep auth boot loader caption sizing aligned with `/me` greeting so the
  React gate does not shrink/replace early LCP text.
- Dashboard queries that remount often need short `staleTime` to cut refetch
  churn; do not refetch-storm the shell on provider remounts.

## 6. Perf change checklist (must pass mentally before commit)

Copy and verify:

- [ ] No new provider type swap above `<Outlet />` after first paint
- [ ] Toast context identity stable; visual host sibling-only if deferred
- [ ] Protected outlet never commits under IconProvider-only then upgrades
- [ ] `StudioBrandProvider` still under QueryProvider
- [ ] Session sockets deferred; no late wrap of bare-painted children
- [ ] Public mount not blocked on unbounded CSS; `#boot-public` can dismiss
- [ ] No `router.invalidate()` on first auth settle
- [ ] No new late API string/image that can become LCP on `/app` or `/me`
- [ ] Login works without IconProvider
- [ ] If touching boot/LCP: consider authenticated Lighthouse on `/app` /
  `/login` (mobile) before claiming a win

## 7. Out of scope escape hatch

Only violate a rule when the user **explicitly** accepts a measured regression
or e2e risk. If you must deviate, state which rule, why, and which critical
journeys (`login-logout-switch`, `owner-initial-login`, `role-shells`) you
re-ran.
