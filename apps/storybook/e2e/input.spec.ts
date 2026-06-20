import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-input--default",
  large: "components-input--large",
  disabled: "components-input--disabled",
} as const;

test.describe("Input", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "input-default.png");
    });

    test("large", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.large, "input-large.png");
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.disabled, "input-disabled.png");
    });
  });

  test.describe("interactions", () => {
    test("accepts typed text", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox", { name: "Name" });
      await input.fill("Jane Doe");
      await expect(input).toHaveValue("Jane Doe");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("disabled input is not editable", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(page.getByRole("textbox", { name: "Name" })).toBeDisabled();
    });
  });
});
