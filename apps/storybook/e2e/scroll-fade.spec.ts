import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-scrollfade--default",
  horizontal: "components-scrollfade--horizontal",
} as const;

test.describe("ScrollFade", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — top", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "scroll-fade-default-top.png",
      );
    });

    test("default — scrolled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "scroll-fade-default-scrolled.png",
        async (storyPage) => {
          const scrollContainer = storyPage
            .locator('[data-slot="scroll-fade"]')
            .first();
          await scrollContainer.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
        },
      );
    });

    test("horizontal", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.horizontal,
        "scroll-fade-horizontal.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("scroll container is scrollable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const scrollContainer = page.locator('[data-slot="scroll-fade"]').first();
      const initialScrollTop = await scrollContainer.evaluate(
        (element) => element.scrollTop,
      );

      await scrollContainer.evaluate((element) => {
        element.scrollTop = 100;
      });

      const newScrollTop = await scrollContainer.evaluate(
        (element) => element.scrollTop,
      );
      expect(newScrollTop).toBeGreaterThan(initialScrollTop);
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
