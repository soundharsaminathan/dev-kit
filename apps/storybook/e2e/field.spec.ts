import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-field--default",
  withError: "components-field--with-error",
} as const;

test.describe("Field", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "field-default.png");
    });

    test("with error", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withError,
        "field-with-error.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("input accepts email", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox");
      await input.fill("user@example.com");
      await expect(input).toHaveValue("user@example.com");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("error message is visible", async ({ page }) => {
      await gotoStory(page, STORIES.withError);

      await expect(page.getByText("Email is required")).toBeVisible();
    });
  });
});
