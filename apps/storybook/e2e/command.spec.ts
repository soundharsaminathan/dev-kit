import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-command--default",
  borderless: "components-command--borderless",
} as const;

test.describe("Command", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "command-default.png");
    });

    test("borderless", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.borderless,
        "command-borderless.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("filters command items", async ({ page }) => {
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
