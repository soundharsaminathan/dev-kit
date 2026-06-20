import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  spinner: "components-loader--spinner",
  ring: "components-loader--ring",
} as const;

test.describe("Loader", () => {
  test.describe("visual regression", () => {
    test("spinner", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.spinner, "loader-spinner.png");
    });

    test("ring", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.ring, "loader-ring.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.spinner);
    });

    test("exposes progressbar role", async ({ page }) => {
      await gotoStory(page, STORIES.spinner);

      await expect(page.getByRole("progressbar")).toBeVisible();
      await expect(page.locator("[data-loader]")).toBeVisible();
    });
  });
});
