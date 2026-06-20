import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  determinate: "components-progressbar--determinate",
  indeterminate: "components-progressbar--indeterminate",
} as const;

test.describe("ProgressBar", () => {
  test.describe("visual regression", () => {
    test("determinate", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.determinate,
        "progress-bar-determinate.png",
      );
    });

    test("indeterminate", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.indeterminate,
        "progress-bar-indeterminate.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.determinate);
    });

    test("exposes progressbar with label", async ({ page }) => {
      await gotoStory(page, STORIES.determinate);

      await expect(
        page.getByRole("progressbar", { name: "Upload progress" }),
      ).toBeVisible();
      await expect(page.getByText("60%")).toBeVisible();
    });
  });
});
