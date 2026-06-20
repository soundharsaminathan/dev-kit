import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-alert--default",
  danger: "components-alert--danger",
} as const;

test.describe("Alert", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "alert-default.png");
    });

    test("danger", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.danger, "alert-danger.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes alert role with title and description", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByText("Update available")).toBeVisible();
      await expect(
        page.getByText("A new version is ready to install."),
      ).toBeVisible();
    });
  });
});
