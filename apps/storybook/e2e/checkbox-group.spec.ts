import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-checkboxgroup--default",
  disabled: "components-checkboxgroup--disabled",
  invalid: "components-checkboxgroup--invalid",
} as const;

test.describe("CheckboxGroup", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "checkbox-group-default.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "checkbox-group-disabled.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "checkbox-group-invalid.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("toggles individual checkboxes with Space", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const sms = page.getByRole("checkbox", { name: "SMS" });
      await expect(sms).not.toBeChecked();
      await sms.focus();
      await page.keyboard.press("Space");
      await expect(sms).toBeChecked();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("email is selected by default", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("checkbox", { name: "Email" })).toBeChecked();
    });
  });
});
