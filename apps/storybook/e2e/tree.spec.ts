import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-tree--default",
  withItems: "components-tree--with-items",
  multipleSelection: "components-tree--multiple-selection",
} as const;

test.describe("Tree", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "tree-default.png");
    });

    test("with items", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withItems,
        "tree-with-items.png",
      );
    });

    test("multiple selection", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.multipleSelection,
        "tree-multiple-selection.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("expands collapsed branch on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Vacation")).toBeHidden();
      await page.getByRole("button", { name: /Photos/ }).click();
      await expect(page.getByText("Vacation")).toBeVisible();
    });

    test("collapses expanded branch on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const documentsToggle = page.getByRole("button", { name: /Documents/ });
      await expect(page.getByText("Project")).toBeVisible();
      await documentsToggle.click();
      await expect(page.getByText("Project")).toBeHidden();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes tree with labelled root", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.locator('[data-tree][aria-label="Files"]'),
      ).toBeVisible();
    });
  });
});
