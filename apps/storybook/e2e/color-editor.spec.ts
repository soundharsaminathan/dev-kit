import { test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot } from "./helpers/storybook";

const STORIES = {
  default: "components-coloreditor--default",
  withAlpha: "components-coloreditor--with-alpha",
} as const;

test.describe("ColorEditor", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "color-editor-default.png",
      );
    });

    test("with alpha", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withAlpha,
        "color-editor-with-alpha.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
