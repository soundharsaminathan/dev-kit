import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-gridlist--default",
} as const;

test.describe("GridList", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "grid-list-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders grid list with items", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("grid", { name: "Files" })).toBeVisible();
      await expect(page.getByRole("row", { name: "Documents" })).toBeVisible();
    });
  });
});
