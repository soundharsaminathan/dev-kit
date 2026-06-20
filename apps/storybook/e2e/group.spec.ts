import { test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-group--default",
  withText: "components-group--with-text",
  vertical: "components-group--vertical",
} as const;

test.describe("Group", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "group-default.png");
    });

    test("with text", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withText,
        "group-with-text.png",
      );
    });

    test("vertical", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.vertical, "group-vertical.png");
    });
  });

  test.describe("interactions", () => {
    test("buttons are clickable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "One" }).click();
      await page.getByRole("button", { name: "Two" }).click();
      await page.getByRole("button", { name: "Three" }).click();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
