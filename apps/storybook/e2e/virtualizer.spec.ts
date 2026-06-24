import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-virtualizer--default",
} as const;

test.describe("Virtualizer", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "virtualizer-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders virtualized list", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("listbox", { name: "Virtual list" }),
      ).toBeVisible();
      await expect(page.getByText("Item 1")).toBeVisible();
    });
  });
});
