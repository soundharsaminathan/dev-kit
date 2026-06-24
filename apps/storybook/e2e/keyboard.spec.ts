import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-keyboard--default",
} as const;

test.describe("Keyboard", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "keyboard-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders keyboard shortcut display", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("⌘")).toBeVisible();
      await expect(page.getByText("K", { exact: true })).toBeVisible();
    });
  });
});
