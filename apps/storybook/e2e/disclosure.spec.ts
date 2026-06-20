import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  getDisclosure,
  getDisclosurePanel,
  gotoStory,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-disclosure--default",
} as const;

const TRIGGER_LABEL = "System Requirements";
const PANEL_TEXT = "Requires a modern browser and at least 4GB of RAM.";

test.describe("Disclosure", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — collapsed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: TRIGGER_LABEL }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("disclosure-default-collapsed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — expanded", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: TRIGGER_LABEL }).click();
      await expect(getDisclosure(page)).toHaveAttribute(
        "data-expanded",
        "true",
      );

      await expect(page).toHaveScreenshot("disclosure-default-expanded.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("expands and collapses on trigger click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: TRIGGER_LABEL });
      const panel = getDisclosurePanel(page);

      await expect(panel).toBeHidden();

      await trigger.click();
      await expect(panel).toBeVisible();
      await expect(page.getByText(PANEL_TEXT)).toBeVisible();

      await trigger.click();
      await expect(panel).toBeHidden();
    });

    test("toggle with keyboard Enter", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: TRIGGER_LABEL });
      await trigger.focus();
      await page.keyboard.press("Enter");

      await expect(getDisclosurePanel(page)).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(getDisclosurePanel(page)).toBeHidden();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("expanded panel has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: TRIGGER_LABEL }).click();
        },
      });
    });

    test("trigger reflects expanded state", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: TRIGGER_LABEL });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    test("collapsed panel is hidden from assistive technology", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await expect(getDisclosurePanel(page)).toHaveAttribute(
        "data-hidden",
        "true",
      );
    });

    test("expanded panel is visible and not hidden", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: TRIGGER_LABEL }).click();

      const panel = getDisclosurePanel(page);
      await expect(panel).toBeVisible();
      await expect(panel).not.toHaveAttribute("data-hidden", "");
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("expanded panel appears below the trigger", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: TRIGGER_LABEL });
      await trigger.click();

      const panel = getDisclosurePanel(page);
      const triggerBox = await trigger.boundingBox();
      const panelBox = await panel.boundingBox();

      expect(triggerBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.y).toBeGreaterThanOrEqual(
        triggerBox!.y + triggerBox!.height - 8,
      );
    });
  });
});
