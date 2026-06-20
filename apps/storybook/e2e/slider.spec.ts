import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-slider--default",
  range: "components-slider--range",
  disabled: "components-slider--disabled",
  vertical: "components-slider--vertical",
} as const;

test.describe("Slider", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "slider-default.png");
    });

    test("range", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.range, "slider-range.png");
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "slider-disabled.png",
      );
    });

    test("vertical", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.vertical,
        "slider-vertical.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("increases value with ArrowRight", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const slider = page.getByRole("slider", { name: "Volume" });
      await slider.focus();
      await page.keyboard.press("ArrowRight");

      await expect(page.getByText("51")).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("range slider exposes two thumbs", async ({ page }) => {
      await gotoStory(page, STORIES.range);

      await expect(
        page.getByRole("slider", { name: "Price range" }),
      ).toHaveCount(2);
    });
  });
});
