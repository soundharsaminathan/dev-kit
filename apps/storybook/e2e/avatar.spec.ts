import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  withFallback: "components-avatar--with-fallback",
  group: "components-avatar--group",
} as const;

test.describe("Avatar", () => {
  test.describe("visual regression", () => {
    test("with fallback", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withFallback,
        "avatar-with-fallback.png",
      );
    });

    test("group", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.group, "avatar-group.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.withFallback);
    });

    test("fallback shows initials", async ({ page }) => {
      await gotoStory(page, STORIES.withFallback);

      await expect(page.getByText("JD")).toBeVisible();
      await expect(page.locator("[data-avatar]")).toBeVisible();
    });
  });
});
