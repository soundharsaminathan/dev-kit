import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-text--default",
  description: "components-text--description",
  label: "components-text--label",
} as const;

test.describe("Text", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "text-default.png");
    });

    test("description", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.description,
        "text-description.png",
      );
    });

    test("label", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.label, "text-label.png");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("renders slot content", async ({ page }) => {
      await gotoStory(page, STORIES.label);

      await expect(page.getByText("Email")).toBeVisible();
    });
  });
});
