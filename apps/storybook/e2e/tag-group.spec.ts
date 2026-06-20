import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-taggroup--default",
  removable: "components-taggroup--removable",
} as const;

test.describe("TagGroup", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "tag-group-default.png",
      );
    });

    test("removable", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.removable,
        "tag-group-removable.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("default group label is visible", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Categories")).toBeVisible();
      await expect(page.locator("[data-tag-group]")).toBeVisible();
    });

    test("removable story shows filters label", async ({ page }) => {
      await gotoStory(page, STORIES.removable);

      await expect(page.getByText("Filters")).toBeVisible();
      await expect(page.locator("[data-tag-group]")).toBeVisible();
    });
  });
});
