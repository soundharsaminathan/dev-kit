import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  themeShowcase: "foundation-themes--theme-showcase",
  lightModeComparison: "foundation-themes--light-mode-comparison",
  darkModeComparison: "foundation-themes--dark-mode-comparison",
} as const;

test.describe("Themes", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("theme showcase", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.themeShowcase,
        "themes-theme-showcase.png",
      );
    });

    test("light mode comparison", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.lightModeComparison,
        "themes-light-mode-comparison.png",
      );
    });

    test("dark mode comparison", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.darkModeComparison,
        "themes-dark-mode-comparison.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.themeShowcase);
    });

    test("theme showcase renders preset sections", async ({ page }) => {
      await gotoStory(page, STORIES.themeShowcase);

      await expect(page.getByText("Theme Presets Showcase")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Primary Button" }),
      ).toBeVisible();
    });
  });
});
