import { expect, type Page, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  getDrawerPanel,
  gotoStory,
  isFocusWithin,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-drawer--default",
  leftPlacement: "components-drawer--left-placement",
} as const;

async function waitForDrawerReady(page: Page) {
  const drawer = getDrawerPanel(page);
  await drawer.waitFor({ state: "visible" });
  await drawer.evaluate((element) => {
    const panel = element as HTMLElement;
    panel.style.transition = "none";
    panel.removeAttribute("data-starting-style");
    void panel.offsetHeight;
  });
}

test.describe("Drawer", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Open drawer" }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("drawer-default-closed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      await expect(page).toHaveScreenshot("drawer-default-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("left placement — open", async ({ page }) => {
      await gotoStory(page, STORIES.leftPlacement);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      await expect(page).toHaveScreenshot("drawer-left-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("opens on trigger click and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Open drawer" });
      await trigger.click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      await expect(drawer).toBeVisible();
      await expect(
        drawer.getByRole("heading", { name: "Drawer title" }),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeVisible();
    });

    test("closes when backdrop is clicked", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      await expect(drawer).toBeVisible();

      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      await page.mouse.click(viewport!.width / 2, 24);
      await expect(drawer).toBeHidden();
    });

    test("closes via in-drawer Close button", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      await page.getByRole("button", { name: "Close" }).click();
      await expect(getDrawerPanel(page)).toBeHidden();
    });

    test("moves focus into the drawer when opened", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      await expect.poll(() => isFocusWithin(page, drawer)).toBe(true);
    });

    test("Tab moves focus to the Close button", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open drawer has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: "Open drawer" }).click();
          await waitForDrawerReady(storyPage);
        },
        scopeToStory: false,
      });
    });

    test("drawer handle is hidden from the accessibility tree", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const handle = page.locator('[data-slot="drawer-handle"]');
      await expect(handle).toHaveAttribute("aria-hidden", "true");
      await expect(handle).toHaveAttribute("role", "presentation");
    });

    test("drawer content is exposed to assistive technology", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      await expect(
        page.getByRole("heading", { name: "Drawer title" }),
      ).toBeVisible();
      await expect(
        page.getByText("Swipe down or click outside to dismiss."),
      ).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("bottom drawer panel is anchored to the lower half", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      const box = await drawer.boundingBox();
      expect(box).not.toBeNull();

      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();

      expect(box!.y).toBeGreaterThan(viewport!.height / 2);
      expect(Math.abs(box!.y + box!.height - viewport!.height)).toBeLessThan(
        48,
      );
    });

    test("left drawer panel aligns to the left edge", async ({ page }) => {
      await gotoStory(page, STORIES.leftPlacement);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      const box = await drawer.boundingBox();
      expect(box).not.toBeNull();

      expect(box!.x).toBeLessThanOrEqual(1);
      expect(box!.width).toBeGreaterThan(200);
    });

    test("open drawer panel is mostly within the viewport", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open drawer" }).click();
      await waitForDrawerReady(page);

      const drawer = getDrawerPanel(page);
      const box = await drawer.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();

      const tolerance = 48;
      expect(box!.x).toBeGreaterThanOrEqual(-tolerance);
      expect(box!.y).toBeGreaterThanOrEqual(-tolerance);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        viewport!.width + tolerance,
      );
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        viewport!.height + tolerance,
      );
    });
  });
});
