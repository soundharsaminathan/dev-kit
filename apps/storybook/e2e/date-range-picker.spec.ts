import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-daterangepicker--default",
} as const;

test.describe("DateRangePicker", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "date-range-picker-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("renders date range picker", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Trip dates")).toBeVisible();
      await expect(page.locator("[data-date-picker-trigger]")).toBeVisible();
    });
  });
});
