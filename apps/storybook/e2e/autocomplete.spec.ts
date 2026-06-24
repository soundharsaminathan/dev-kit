import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-autocomplete--default",
  borderless: "components-autocomplete--borderless",
} as const;

test.describe("Autocomplete", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "autocomplete-default.png",
      );
    });

    test("borderless", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.borderless,
        "autocomplete-borderless.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("filters autocomplete items", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("searchbox").fill("cal");
      await expect(
        page.getByRole("option", { name: "Calendar" }),
      ).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Settings" }),
      ).not.toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
