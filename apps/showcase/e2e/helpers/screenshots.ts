import { THEME_FONT_FAMILIES } from "@dev-ui/tokens";
import { expect, type Locator, type Page } from "@playwright/test";

export const FULL_PAGE_SCREENSHOT_OPTIONS = { fullPage: true } as const;
export const VIEWPORT_SCREENSHOT_OPTIONS = { fullPage: false } as const;

export function getControlsPanel(page: Page): Locator {
  return page.getByTestId("controls-panel");
}

async function prepareShowcaseStorage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-ui-theme", "default");
    window.localStorage.setItem("dev-ui-theme-mode", "light");
  });
}

export async function waitForAppHeader(page: Page) {
  const header = page
    .locator("header")
    .filter({ has: page.getByRole("link", { name: "Component Showcase" }) });
  await expect(header).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Component Showcase" }),
  ).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Edit theme" }),
  ).toBeVisible();
  await expect(
    header.getByRole("radiogroup", { name: "Theme mode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Theme editor", level: 2 }),
  ).toBeHidden();
}

async function closeThemeEditorDrawer(page: Page) {
  const themeEditor = page.getByRole("heading", {
    name: "Theme editor",
    level: 2,
  });
  if (await themeEditor.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Close theme editor" }).click();
    await themeEditor.waitFor({ state: "hidden" });
  }
}

async function waitForFonts(page: Page) {
  await page.evaluate(
    async (families) => {
      await Promise.all(
        families.flatMap((family) => [
          document.fonts.load(`400 16px "${family}"`),
          document.fonts.load(`600 16px "${family}"`),
        ]),
      );
      await document.fonts.ready;
    },
    [...THEME_FONT_FAMILIES],
  );
}

export async function preparePageForScreenshot(page: Page) {
  await closeThemeEditorDrawer(page);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const header = page
    .locator("header")
    .filter({ has: page.getByRole("link", { name: "Component Showcase" }) });
  if (await header.isVisible().catch(() => false)) {
    await waitForAppHeader(page);
  }
  await waitForFonts(page);
}

export async function waitForScreenshotReady(page: Page) {
  await page.waitForLoadState("load");
  await waitForFonts(page);
}

export async function gotoShowcasePage(page: Page, path: string) {
  await prepareShowcaseStorage(page);
  await page.goto(path, { waitUntil: "load" });
}

export async function waitForThemesPage(page: Page) {
  await page.getByRole("heading", { name: "Themes" }).waitFor({
    state: "visible",
  });
  await page.getByRole("heading", { name: "Dark mode" }).waitFor({
    state: "visible",
  });
  await page.locator("[data-theme]").last().waitFor({ state: "visible" });
}

export async function waitForComponentCardPreviews(page: Page) {
  const cards = page.locator("[data-component]");
  const count = await cards.count();

  for (let index = 0; index < count; index++) {
    await cards.nth(index).scrollIntoViewIfNeeded();
  }

  await expect(
    page.locator('[data-component][data-preview="pending"]'),
  ).toHaveCount(0, { timeout: 30_000 });
}

export async function setEnumControl(page: Page, label: string, value: string) {
  const controls = getControlsPanel(page);
  const field = controls.getByText(label, { exact: true }).locator("..");
  await field.getByRole("button").click();
  const option = page.getByRole("option", { name: value });
  await option.waitFor({ state: "visible" });
  await option.click();
  await option.waitFor({ state: "hidden" });
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
  if (options?.locator) {
    await closeThemeEditorDrawer(page);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await waitForScreenshotReady(page);
  } else {
    await preparePageForScreenshot(page);
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
