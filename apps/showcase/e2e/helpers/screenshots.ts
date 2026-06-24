import { expect, type Locator, type Page } from "@playwright/test";

export const VIEWPORT_SCREENSHOT_OPTIONS = { fullPage: false } as const;

export function getControlsPanel(page: Page): Locator {
  return page.getByTestId("controls-panel");
}

async function prepareShowcaseStorage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme-preset", "modern-minimal");
    window.localStorage.setItem("theme-mode", "light");
  });
}

export async function waitForScreenshotReady(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

export async function gotoShowcasePage(page: Page, path: string) {
  await prepareShowcaseStorage(page);
  await page.goto(path);
  await waitForScreenshotReady(page);
}

export async function waitForThemesPage(page: Page) {
  await page.getByRole("heading", { name: "Theme presets" }).waitFor({
    state: "visible",
  });
  await page.getByRole("heading", { name: "Dark mode" }).waitFor({
    state: "visible",
  });
  await page
    .locator("[data-theme-preset]")
    .last()
    .waitFor({ state: "visible" });
}

export async function setEnumControl(page: Page, label: string, value: string) {
  const controls = getControlsPanel(page);
  const field = controls.getByText(label, { exact: true }).locator("..");
  await field.getByRole("button").click();
  await page.getByRole("option", { name: value }).click();
}

export async function toggleBooleanControl(page: Page, label: string) {
  await getControlsPanel(page).getByText(label, { exact: true }).click();
}

export async function expectPageScreenshot(
  page: Page,
  path: string,
  screenshotName: string,
  options?: {
    beforeScreenshot?: (page: Page) => Promise<void>;
    fullPage?: boolean;
    locator?: Locator;
  },
) {
  await gotoShowcasePage(page, path);
  if (options?.beforeScreenshot) {
    await options.beforeScreenshot(page);
  }
  const target = options?.locator ?? page;
  await expect(target).toHaveScreenshot(screenshotName, {
    fullPage: options?.fullPage ?? false,
  });
}

export function getDemoFrame(page: Page): Locator {
  return page.getByTestId("demo-frame");
}

export async function expectDemoScreenshot(
  page: Page,
  path: string,
  screenshotName: string,
  options?: {
    beforeScreenshot?: (page: Page) => Promise<void>;
  },
) {
  await gotoShowcasePage(page, path);
  if (options?.beforeScreenshot) {
    await options.beforeScreenshot(page);
  }
  await expect(getDemoFrame(page)).toHaveScreenshot(screenshotName);
}
