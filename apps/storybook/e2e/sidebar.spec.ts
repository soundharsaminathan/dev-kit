import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-sidebar--default",
  collapsed: "components-sidebar--collapsed",
  rightPlacement: "components-sidebar--right-placement",
} as const;

test.describe("Sidebar", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "sidebar-default.png");
    });

    test("collapsed", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.collapsed,
        "sidebar-collapsed.png",
      );
    });

    test("right placement", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.rightPlacement,
        "sidebar-right-placement.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("toggle button collapses sidebar", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const sidebar = page.locator("[data-sidebar='']");
      await expect(sidebar).toHaveAttribute("data-expanded", "true");

      await page.getByRole("button", { name: "Toggle sidebar" }).click();

      await expect(sidebar).not.toHaveAttribute("data-expanded");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
