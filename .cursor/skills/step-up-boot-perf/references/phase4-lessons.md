# Phase 4 lessons (PR #13)

Source: Step Up Phase 4 `/app` Lighthouse work and follow-up critical e2e
fixes. Read when a rule in `SKILL.md` needs “why” context.

## Measured targets (mobile, Lighthouse ~13.4, median)

Primary routes after Phase 4:

| Route | FCP | LCP | TBT | CLS | Perf |
| ----- | --: | --: | --: | --: | ---: |
| `/app` | 1.96s | 2.25s | 99ms | 0.022 | 94 |
| `/me` | 1.95s | 2.25s | 72ms | 0.069 | 90 |
| `/` | 2.11s | 2.41s | 13ms | 0.027 | 96 |
| `/login` | 1.96s | 2.40s | 147ms | 0.026 | 95 |

`/app` before → after: LCP 3.17s → 2.25s, TBT 338ms → 99ms, Perf 86 → 94.

Child routes with **late content LCP** (API/images) still regress — do not
“fix” by enlarging home copy; fix the route’s own critical content:

| Route | Typical failure |
| ----- | --------------- |
| `/app/batches` | Late batch cover images / API |
| `/app/bookings` | Late booking content / API |

## Failure modes that bit CI

1. **Provider remount** — Deferred Toast/Theme/Session swapped wrapper types
   after paint → forms reset; booking/attendance e2e flaked.
2. **`useTheme` without ThemeProvider** — Protected outlet under IconProvider
   only → admin studio wizard crash.
3. **`No QueryClient set`** — `StudioBrandProvider` inside `AppThemeProvider`
   above `QueryProvider` → login/admin critical journeys crashed on theme
   remount.
4. **`#boot-public` stuck** — Public `mountApp` awaited CSS forever; React
   form never became interactive; e2e saw Welcome text with no fields.
5. **First-load `router.invalidate()`** — Remounted active route + raced
   preload → wiped UI state.
6. **Late LCP theft** — Pending booking meta, funnel hints, oversized home
   subtitle, banner images became LCP only after 5–8s throttled API/images.
7. **Toast gated shell** — Waiting on motion ToastProvider before protected
   paint pushed `/app` LCP ~8s; fixed with noop ToastContext + sibling host.
8. **Login IconProvider** — Password `Icon` toggle crashed before idle theme
   hydrate; switched to text toggle.
9. **Dropped styles barrel without per-chunk CSS** — Removing
   `@dev-ui/components/styles` was correct for boot weight, but Vite lib
   mode extracts CSS without linking it from dist JS. Production then
   shipped unstyled Buttons/Select/Sidebar/Menu (grey native controls,
   no sidebar collapse transition). Fix: inject per-chunk CSS imports in
   `emitStylesEntryPlugin` (`scripts/vite/lib-build.ts`); keep the barrel
   only for Storybook/showcase. Node/Playwright imports of dist (showcase
   visual registry) need `scripts/css-noop-loader.mjs` registered in
   `apps/showcase/playwright.config.ts`.

## Key files (do not casually rewrite)

- `apps/step-up/src/main.tsx` — style wait bounds, auth invalidate skip
- `apps/step-up/src/routes/__root.tsx` — provider order
- `apps/step-up/src/lib/boot-theme-provider.tsx`
- `apps/step-up/src/lib/app-theme-provider.tsx`
- `apps/step-up/src/lib/deferred-toast.tsx`
- `apps/step-up/src/lib/session-gate.tsx`
- `apps/step-up/src/lib/session-providers.tsx`
- `apps/step-up/src/lib/use-dismiss-boot-public.ts`
- `apps/step-up/index.html` — `#boot-public` static shells
- `apps/step-up/src/routes/app/index.tsx` — home LCP ownership
- `apps/step-up/scripts/run-lighthouse*.mjs` — measurement harness
