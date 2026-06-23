import { expect, type Locator, type Page } from "@playwright/test";

export const VIEWPORT_SCREENSHOT_OPTIONS = { fullPage: false } as const;

export function getControlsPanel(page: Page): Locator {
  return page.getByTestId("controls-panel");
}

export async function gotoShowcasePage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
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
  },
) {
  await gotoShowcasePage(page, path);
  if (options?.beforeScreenshot) {
    await options.beforeScreenshot(page);
  }
  await expect(page).toHaveScreenshot(screenshotName, {
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
