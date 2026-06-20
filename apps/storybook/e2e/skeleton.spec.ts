import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  placeholder: "components-skeleton--placeholder",
  withContent: "components-skeleton--with-content",
} as const;

test.describe("Skeleton", () => {
  test.describe("visual regression", () => {
    test("placeholder", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.placeholder,
        "skeleton-placeholder.png",
      );
    });

    test("with content", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withContent,
        "skeleton-with-content.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.placeholder);
    });

    test("marks loading state", async ({ page }) => {
      await gotoStory(page, STORIES.placeholder);

      await expect(
        page.locator("[data-skeleton-loading='true']"),
      ).toBeVisible();
    });
  });
});
