import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-toolbar--default",
} as const;

test.describe("Toolbar", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "toolbar-default.png");
    });
  });

  test.describe("interactions", () => {
    test("renders toolbar with buttons", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("toolbar", { name: "Formatting" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
    });
  });
});
