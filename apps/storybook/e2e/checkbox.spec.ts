import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-checkbox--default",
  selected: "components-checkbox--selected",
  indeterminate: "components-checkbox--indeterminate",
  disabled: "components-checkbox--disabled",
  invalid: "components-checkbox--invalid",
} as const;

const LABEL = "Accept terms";

test.describe("Checkbox", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "checkbox-default.png",
      );
    });

    test("selected", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.selected,
        "checkbox-selected.png",
      );
    });

    test("indeterminate", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.indeterminate,
        "checkbox-indeterminate.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "checkbox-disabled.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "checkbox-invalid.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("toggles on Space key", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const checkbox = page.getByRole("checkbox", { name: LABEL });
      await expect(checkbox).not.toBeChecked();

      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("selected state is reflected", async ({ page }) => {
      await gotoStory(page, STORIES.selected);

      await expect(page.getByRole("checkbox", { name: LABEL })).toBeChecked();
    });

    test("disabled checkbox is not interactive", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(page.getByRole("checkbox", { name: LABEL })).toBeDisabled();
    });
  });
});
