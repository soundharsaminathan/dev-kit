import { expect, type Locator, type Page } from "@playwright/test";

export const STORY_ROOT = "#storybook-root";

export const DEFAULT_GLOBALS = {
  themePreset: "modern-minimal",
  themeMode: "light",
} as const;

export const VIEWPORT_TOLERANCE = 56;

export function getDrawerPanel(page: Page): Locator {
  return page.locator("[data-drawer][data-open]");
}

export function getModalPanel(page: Page): Locator {
  return page.locator('[data-modal=""]');
}

export function getMenuContent(page: Page): Locator {
  return page.locator('[data-menu-content=""]');
}

export function getTooltipContent(page: Page): Locator {
  return page.locator('[data-tooltip-content=""]');
}

export function getPopover(page: Page): Locator {
  return page.locator('[data-popover=""]');
}

export function storyIframeUrl(
  storyId: string,
  globals: Record<string, string> = DEFAULT_GLOBALS,
) {
  const baseUrl = process.env.STORYBOOK_URL ?? "http://localhost:6006";
  const url = new URL("/iframe.html", baseUrl);
  url.searchParams.set("id", storyId);
  url.searchParams.set("viewMode", "story");
  url.searchParams.set(
    "globals",
    Object.entries(globals)
      .map(([key, value]) => `${key}:${value}`)
      .join(","),
  );
  return url.toString();
}

export async function gotoStory(
  page: Page,
  storyId: string,
  globals: Record<string, string> = DEFAULT_GLOBALS,
) {
  await page.goto(storyIframeUrl(storyId, globals), {
    waitUntil: "domcontentloaded",
  });
  const storyRoot = page.locator(STORY_ROOT);
  await storyRoot.waitFor({ state: "attached" });
  await expect(storyRoot.locator(":scope > *").first()).toBeVisible({
    timeout: 30_000,
  });
}

export const VIEWPORT_SCREENSHOT_OPTIONS = { fullPage: false } as const;

/**
 * Capture a Storybook story screenshot at the fixed Playwright viewport.
 * Uses viewport-only capture (not fullPage) so dimensions stay 1280×720
 * across local and CI environments.
 */
export async function expectStoryScreenshot(
  page: Page,
  storyId: string,
  screenshotName: string,
  options?: {
    beforeScreenshot?: (page: Page) => Promise<void>;
    fullPage?: boolean;
  },
) {
  await gotoStory(page, storyId);
  if (options?.beforeScreenshot) {
    await options.beforeScreenshot(page);
  }
  await expect(page).toHaveScreenshot(screenshotName, {
    fullPage: options?.fullPage ?? false,
  });
}

export async function waitForDrawerReady(page: Page) {
  const drawer = getDrawerPanel(page);
  await drawer.waitFor({ state: "visible" });

  await expect
    .poll(
      async () =>
        drawer.evaluate((element) => {
          const { transform } = getComputedStyle(element);
          if (!transform || transform === "none") {
            return 0;
          }

          const values = transform
            .match(/matrix(?:3d)?\((.+)\)/)?.[1]
            ?.split(",")
            .map((value) => Number.parseFloat(value.trim()));

          if (!values || values.some((value) => !Number.isFinite(value))) {
            return 0;
          }

          const x = values.length === 16 ? values[12]! : values[4]!;
          const y = values.length === 16 ? values[13]! : values[5]!;
          return Math.hypot(x, y);
        }),
      { timeout: 10_000 },
    )
    .toBeLessThan(0.5);

  const backdrop = page.locator("[data-drawer-backdrop][data-open]");
  if ((await backdrop.count()) > 0) {
    await expect
      .poll(
        async () =>
          backdrop.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).opacity),
          ),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0.99);
  }
}

export async function waitForModalReady(page: Page) {
  await getModalPanel(page).waitFor({ state: "visible" });
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

export async function waitForMenuReady(page: Page) {
  await getMenuContent(page).waitFor({ state: "visible" });
}

export function getSelectTrigger(page: Page): Locator {
  return page.locator('[data-select-trigger=""]');
}

export function getComboboxInput(page: Page): Locator {
  return page.getByRole("combobox");
}

export function getInputGroup(page: Page): Locator {
  return page.locator('[data-input-group=""]');
}

export function getEditableDateSegment(page: Page, index = 0): Locator {
  return page
    .locator('[data-date-segment]:not([aria-hidden="true"])')
    .nth(index);
}

export async function focusFirstDateSegment(page: Page) {
  const segment = getEditableDateSegment(page);
  await segment.waitFor({ state: "visible" });
  await segment.click();
  await expect(segment).toBeFocused();
  return segment;
}

export async function waitForPopoverSettled(page: Page) {
  const popover = getPopover(page);
  await expect(popover).toHaveAttribute("data-state", "open");
  await popover.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const duration = Number.parseFloat(
          getComputedStyle(element).transitionDuration,
        );
        const delayMs = Number.isFinite(duration) ? duration * 1000 + 50 : 250;
        window.setTimeout(resolve, delayMs);
      }),
  );
}

export async function openCombobox(page: Page) {
  const input = getComboboxInput(page);
  await input.focus();
  await page.getByRole("listbox").waitFor({ state: "visible" });
  await waitForPopoverSettled(page);
  return input;
}

export function getContextMenuTrigger(page: Page): Locator {
  return page.locator('[data-context-menu=""]');
}

export async function openContextMenu(page: Page) {
  const trigger = getContextMenuTrigger(page);
  await trigger.waitFor({ state: "visible" });
  const box = await trigger.boundingBox();

  if (!box) {
    throw new Error("Could not measure context menu trigger bounds");
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: "right",
  });
  await waitForMenuReady(page);
  return trigger;
}

export function getDisclosure(page: Page, index = 0): Locator {
  return page.locator('[data-disclosure=""]').nth(index);
}

export function getDisclosurePanel(page: Page, index = 0): Locator {
  return page.locator('[data-disclosure-panel=""]').nth(index);
}

export function getTabsRoot(page: Page): Locator {
  return page.locator('[data-tabs=""]');
}

export async function waitForTooltipReady(page: Page) {
  await getTooltipContent(page).waitFor({ state: "visible" });
}

export async function openTooltip(page: Page, triggerName: string | RegExp) {
  const trigger = page.getByRole("button", { name: triggerName });
  await trigger.focus();
  await waitForTooltipReady(page);
  return trigger;
}

export async function isFocusWithin(_page: Page, container: Locator) {
  return container.evaluate((element) => {
    const active = document.activeElement;
    return active instanceof Node && element.contains(active);
  });
}

export async function clickBackdrop(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Viewport size is unavailable");
  }
  await page.mouse.click(viewport.width / 2, 24);
}

export async function expectOverlayBelowTrigger(
  trigger: Locator,
  overlay: Locator,
  tolerance = VIEWPORT_TOLERANCE,
) {
  const triggerBox = await trigger.boundingBox();
  const overlayBox = await overlay.boundingBox();

  if (!triggerBox || !overlayBox) {
    throw new Error("Could not measure trigger or overlay bounds");
  }

  expect(overlayBox.y).toBeGreaterThanOrEqual(
    triggerBox.y + triggerBox.height - tolerance,
  );
}

export async function expectOverlayAlignedWithTrigger(
  trigger: Locator,
  overlay: Locator,
  tolerance = 2,
) {
  const triggerBox = await trigger.boundingBox();
  const overlayBox = await overlay.boundingBox();

  if (!triggerBox || !overlayBox) {
    throw new Error("Could not measure trigger or overlay bounds");
  }

  expect(Math.abs(overlayBox.x - triggerBox.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(overlayBox.width - triggerBox.width)).toBeLessThanOrEqual(
    tolerance,
  );
}

export async function expectPanelMostlyCentered(
  panel: Locator,
  page: Page,
  tolerance = 120,
) {
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    throw new Error("Could not measure panel or viewport bounds");
  }

  const panelCenterX = box.x + box.width / 2;
  const panelCenterY = box.y + box.height / 2;

  expect(Math.abs(panelCenterX - viewport.width / 2)).toBeLessThanOrEqual(
    tolerance,
  );
  expect(Math.abs(panelCenterY - viewport.height / 2)).toBeLessThanOrEqual(
    tolerance,
  );
}
