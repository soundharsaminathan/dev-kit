import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectOverlayBelowTrigger,
  gotoStory,
  openTooltip,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-tooltip--default",
} as const;

const TRIGGER_NAME = "Hover or tap me";

test.describe("Tooltip", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: TRIGGER_NAME }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("tooltip-default-closed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — open on focus", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openTooltip(page, TRIGGER_NAME);

      await expect(page).toHaveScreenshot("tooltip-default-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("shows on focus and hides on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openTooltip(page, TRIGGER_NAME);

      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveText("Add to library");

      await page.keyboard.press("Escape");
      await expect(tooltip).toBeHidden();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open tooltip has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await openTooltip(storyPage, TRIGGER_NAME);
        },
        scopeToStory: false,
      });
    });

    test("tooltip content uses tooltip role", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openTooltip(page, TRIGGER_NAME);

      await expect(page.getByRole("tooltip")).toHaveAttribute(
        "data-placement",
        "bottom",
      );
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("tooltip opens below the trigger", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = await openTooltip(page, TRIGGER_NAME);

      await expectOverlayBelowTrigger(
        trigger,
        page.locator('[data-tooltip-content=""]'),
      );
    });
  });
});
