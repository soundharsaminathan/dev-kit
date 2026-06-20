import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  neutral: "components-badge--neutral",
  accent: "components-badge--accent",
  subtleDanger: "components-badge--subtle-danger",
  large: "components-badge--large",
} as const;

test.describe("Badge", () => {
  test.describe("visual regression", () => {
    test("neutral", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.neutral, "badge-neutral.png");
    });

    test("accent", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.accent, "badge-accent.png");
    });

    test("subtle danger", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.subtleDanger,
        "badge-subtle-danger.png",
      );
    });

    test("large", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.large, "badge-large.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.neutral);
    });

    test("renders with presentation role", async ({ page }) => {
      await gotoStory(page, STORIES.neutral);

      await expect(page.getByText("Badge")).toBeVisible();
      await expect(page.locator("[data-badge]")).toBeVisible();
    });
  });
});
