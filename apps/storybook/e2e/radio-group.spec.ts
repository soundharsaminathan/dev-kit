import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-radiogroup--default",
  disabled: "components-radiogroup--disabled",
  invalid: "components-radiogroup--invalid",
} as const;

test.describe("RadioGroup", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "radio-group-default.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "radio-group-disabled.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "radio-group-invalid.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("selects a different option with keyboard", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const pro = page.getByRole("radio", { name: "Pro" });
      await pro.focus();
      await page.keyboard.press("Space");
      await expect(pro).toBeChecked();
      await expect(page.getByRole("radio", { name: "Free" })).not.toBeChecked();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("free is selected by default", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("radio", { name: "Free" })).toBeChecked();
    });
  });
});
