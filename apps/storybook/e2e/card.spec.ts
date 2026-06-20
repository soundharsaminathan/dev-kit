import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-card--default",
} as const;

test.describe("Card", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "card-default.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes card structure with title and content", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Card title")).toBeVisible();
      await expect(page.getByText("Card description")).toBeVisible();
      await expect(page.getByText("Main content")).toBeVisible();
      await expect(page.getByText("Footer actions")).toBeVisible();
      await expect(page.locator("[data-card]")).toBeVisible();
    });
  });
});
