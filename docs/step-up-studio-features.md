# Step Up — Studio Feature Management

Per-studio module flags controlled by System Admin. Feature **access** is separate from module **configuration** (e.g. Payments enabled ≠ Razorpay keys configured).

## Model

- `Feature` — global catalog (`key`, `name`, `description`, `category`, `globallyEnabled`, `dependsOnKeys`)
- `StudioFeature` — explicit `(studioId, featureId, enabled)` row

**Fail closed:** missing row, unknown key, or `globallyEnabled: false` → disabled.

## Adding a new feature

1. Insert a `Feature` catalog row (migration or seed). Existing studios stay **off** until you enable them (or backfill `StudioFeature` with `enabled: true`).
2. Add the key to:
   - [`apps/step-up-api/src/studio-features/feature-keys.ts`](../apps/step-up-api/src/studio-features/feature-keys.ts)
   - [`apps/step-up/src/lib/feature-keys.ts`](../apps/step-up/src/lib/feature-keys.ts)
3. Mark the Nest controller (or methods) with `@RequireFeature("your_key")` and ensure `FeatureGuard` is in `@UseGuards(...)`.
4. On the web app:
   - Set `feature: "your_key"` on nav links in [`nav-config.ts`](../apps/step-up/src/modules/layout/nav-config.ts)
   - Wrap the route with `<RequireStudioFeature feature="your_key">`

Optional: if the new module should start on for every studio, backfill:

```sql
INSERT INTO "StudioFeature" ("studioId", "featureId", "enabled", "createdAt", "updatedAt")
SELECT s."id", f."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Studio" s
CROSS JOIN "Feature" f
WHERE f."key" = 'your_key'
ON CONFLICT DO NOTHING;
```

## Admin UI

`/admin/studios/:id/features` — System Admin toggles per module, grouped by category.

## APIs

- `GET /studios/:studioId/features` — studio members or System Admin
- `PATCH /studios/:studioId/features/:key` `{ enabled }` — System Admin only

## Initial keys

`chat`, `feed`, `payments`, `expenses`, `payouts`, `contests`, `bookings`, `data_import`, `ai_agent`
