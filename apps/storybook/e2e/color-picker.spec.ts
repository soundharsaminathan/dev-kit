import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectStoryScreenshot,
  gotoStory,
  waitForModalReady,
} from "./helpers/storybook";

const STORIES = {
  default: "components-colorpicker--default",
  open: "components-colorpicker--open",
} as const;

test.describe("ColorPicker", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "color-picker-default.png",
      );
    });

    test("open", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.open, "color-picker-open.png");
    });
  });

  test.describe("interactions", () => {
    test("opens the picker dialog", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Pick color" }).click();
      await waitForModalReady(page);
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
