import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-draganddrop--default",
} as const;

test.describe("DragAndDrop", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "drag-and-drop-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders reorderable list", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.locator("[data-listbox='']")).toBeVisible();
      await expect(page.locator("[data-listbox-item='']")).toHaveCount(4);
    });
  });
});
