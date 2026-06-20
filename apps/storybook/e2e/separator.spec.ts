import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  horizontal: "components-separator--horizontal",
  vertical: "components-separator--vertical",
} as const;

test.describe("Separator", () => {
  test.describe("visual regression", () => {
    test("horizontal", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.horizontal,
        "separator-horizontal.png",
      );
    });

    test("vertical", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.vertical,
        "separator-vertical.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.horizontal);
    });

    test("exposes separator role", async ({ page }) => {
      await gotoStory(page, STORIES.horizontal);

      await expect(page.getByRole("separator")).toBeVisible();
    });
  });
});
