import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  level1: "components-heading--level-1",
  level2: "components-heading--level-2",
  level3: "components-heading--level-3",
} as const;

test.describe("Heading", () => {
  test.describe("visual regression", () => {
    test("level 1", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.level1, "heading-level-1.png");
    });

    test("level 2", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.level2, "heading-level-2.png");
    });

    test("level 3", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.level3, "heading-level-3.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.level1);
    });

    test("renders correct heading levels", async ({ page }) => {
      await gotoStory(page, STORIES.level1);
      await expect(
        page.getByRole("heading", { name: "Section title", level: 1 }),
      ).toBeVisible();

      await gotoStory(page, STORIES.level2);
      await expect(
        page.getByRole("heading", { name: "Page title", level: 2 }),
      ).toBeVisible();

      await gotoStory(page, STORIES.level3);
      await expect(
        page.getByRole("heading", { name: "Subsection", level: 3 }),
      ).toBeVisible();
    });
  });
});
