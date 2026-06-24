import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-colorwheel--default",
} as const;

test.describe("ColorWheel", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "color-wheel-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders color wheel slider", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("slider", { name: "Hue" })).toBeVisible();
    });
  });
});
