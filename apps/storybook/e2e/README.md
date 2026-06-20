# Storybook E2E tests

Playwright visual regression, interaction, and accessibility tests for Storybook stories.

## Viewport strategy

| Project | Size | Purpose |
| --- | --- | --- |
| `chromium` | 1280×720 | Default desktop canvas; **all** tests run here |
| `chromium-tablet` | 768×1024 | Responsive visual/layout tests only |
| `chromium-mobile` | 375×667 | Responsive visual/layout tests only |

Snapshots are namespaced by project: `button-default-chromium.png`, `drawer-default-open-chromium-tablet.png`.

### What runs at every viewport

Tag visual regression and layout suites with `@responsive` via `responsiveDescribeOptions` from `./helpers/viewports.ts`. See `RESPONSIVE_COMPONENTS` in that file for the current list (overlays, tables, navigation, etc.).

Interaction and accessibility suites stay **desktop-only** — behavior does not change by width, so re-running them on tablet/mobile would only slow CI.

### Desktop-only components

Primitives with fixed layout (Button, Badge, Checkbox, …) are listed in `DESKTOP_ONLY_COMPONENTS`. Their visual tests run on the `chromium` project only.

## Folder structure

```
e2e/
├── README.md
├── helpers/
│   ├── a11y.ts           # AxeBuilder scans (expectStoryAccessible)
│   ├── storybook.ts      # story navigation, overlay locators, screenshot helper
│   └── viewports.ts      # viewport matrix, @responsive tag, component lists
├── <component>.spec.ts   # one file per component
└── <component>.spec.ts-snapshots/
    ├── <name>-chromium.png
    ├── <name>-chromium-tablet.png   # responsive components only
    └── <name>-chromium-mobile.png   # responsive components only
```

Each spec follows the same shape:

```
Component
├── visual regression [@responsive when applicable]
├── interactions            (desktop only)
├── accessibility           (desktop only — AxeBuilder + role/focus checks)
└── layout [@responsive when applicable]
```

## Accessibility (AxeBuilder)

Each component spec includes at least one `expectStoryAccessible` scan in its `accessibility` describe block. Helpers live in `./helpers/a11y.ts`.

- **Default state** — scan is scoped to `#storybook-root` to avoid Storybook chrome noise.
- **Open overlays** (menu, modal, drawer, …) — pass `beforeScan` and set `scopeToStory: false` because portals render outside the story root.
- **Interaction/a11y checks** — existing role and focus assertions are kept alongside Axe scans.

```typescript
import { expectStoryAccessible } from "./helpers/a11y";

test("default story has no accessibility violations", async ({ page }) => {
  await expectStoryAccessible(page, STORIES.default);
});

test("open menu has no accessibility violations", async ({ page }) => {
  await expectStoryAccessible(page, STORIES.default, {
    beforeScan: async (storyPage) => {
      await storyPage.getByRole("button", { name: "Open menu" }).click();
      await waitForMenuReady(storyPage);
    },
    scopeToStory: false,
  });
});
```

## Commands

```bash
# Full suite — desktop, tablet, and mobile projects
pnpm test:e2e

# Regenerate all snapshots (all viewports)
pnpm test:e2e:update
```

## Adding a new component

1. Create `<component>.spec.ts` mirroring an existing spec.
2. If the component has breakpoint-dependent layout or overlays, import `responsiveDescribeOptions` and pass it to `visual regression` (and `layout`) describe blocks.
3. Run `pnpm test:e2e:update` to seed snapshots for every viewport.
