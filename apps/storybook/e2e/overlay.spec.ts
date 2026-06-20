import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectStoryScreenshot,
  gotoStory,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";

const STORIES = {
  default: "components-overlay--default",
  drawer: "components-overlay--drawer",
  popover: "components-overlay--popover",
} as const;

test.describe("Overlay", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "overlay-default.png",
        {
          ...VIEWPORT_SCREENSHOT_OPTIONS,
        },
      );
    });

    test("drawer", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.drawer, "overlay-drawer.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("popover", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.popover,
        "overlay-popover.png",
        {
          ...VIEWPORT_SCREENSHOT_OPTIONS,
        },
      );
    });
  });

  test.describe("interactions", () => {
    test("renders overlay content when open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Overlay content goes here.")).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
