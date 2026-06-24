import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-form--default",
} as const;

test.describe("Form", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "form-default.png");
    });
  });

  test.describe("interactions", () => {
    test("renders email text field", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    });
  });
});
