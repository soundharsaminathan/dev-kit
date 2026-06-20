import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-empty--default",
} as const;

test.describe("Empty", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "empty-default.png");
    });
  });

  test.describe("interactions", () => {
    test("action button is clickable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const button = page.getByRole("button", { name: "Create project" });
      await expect(button).toBeVisible();
      await button.click();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes title and description", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("No projects yet")).toBeVisible();
      await expect(
        page.getByText("Create your first project to get started."),
      ).toBeVisible();
    });
  });
});
