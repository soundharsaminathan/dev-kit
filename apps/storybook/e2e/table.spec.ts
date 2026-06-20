import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-table--default",
  sortable: "components-table--sortable",
} as const;

test.describe("Table", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "table-default.png");
    });

    test("sortable", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.sortable, "table-sortable.png");
    });
  });

  test.describe("interactions", () => {
    test("toggles sort direction on column header click", async ({ page }) => {
      await gotoStory(page, STORIES.sortable);

      const nameHeader = page.getByRole("columnheader", { name: "Name" });
      await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

      await nameHeader.click();
      await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes grid with column headers", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("grid", { name: "Users" })).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Name" }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Email" }),
      ).toBeVisible();
    });
  });
});
