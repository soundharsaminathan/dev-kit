import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-pagination--default",
} as const;

test.describe("Pagination", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "pagination-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("navigates to next page", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "2", exact: true }),
      ).toHaveAttribute("aria-current", "page");

      await page.getByRole("button", { name: "Go to next page" }).click();
      await expect(
        page.getByRole("button", { name: "3", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("navigates to previous page", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Go to next page" }).click();
      await page.getByRole("button", { name: "Go to previous page" }).click();
      await expect(
        page.getByRole("button", { name: "2", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes navigation landmark", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("navigation", { name: "pagination" }),
      ).toBeVisible();
    });
  });
});
