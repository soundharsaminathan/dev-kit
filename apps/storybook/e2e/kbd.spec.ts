import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-kbd--default",
  group: "components-kbd--group",
} as const;

test.describe("Kbd", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "kbd-default.png");
    });

    test("group", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.group, "kbd-group.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("renders keyboard shortcut text", async ({ page }) => {
      await gotoStory(page, STORIES.group);

      await expect(page.getByText("⌘")).toBeVisible();
      await expect(page.getByText("K", { exact: true })).toBeVisible();
    });
  });
});
