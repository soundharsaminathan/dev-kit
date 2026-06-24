import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-overlayarrow--default",
} as const;

test.describe("OverlayArrow", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "overlay-arrow-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders overlay arrow", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.locator("[data-overlay-arrow='']")).toBeVisible();
    });
  });
});
