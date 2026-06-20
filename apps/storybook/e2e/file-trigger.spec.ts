import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-filetrigger--default",
  multiple: "components-filetrigger--multiple",
} as const;

test.describe("FileTrigger", () => {
  test.describe("visual regression", () => {
    test("default — closed", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "file-trigger-default-closed.png",
      );
    });

    test("multiple — closed", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.multiple,
        "file-trigger-multiple-closed.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("choose file button is clickable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Choose file" }),
      ).toBeVisible();
    });

    test("multiple files button is clickable", async ({ page }) => {
      await gotoStory(page, STORIES.multiple);

      await expect(
        page.getByRole("button", { name: "Choose files" }),
      ).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
