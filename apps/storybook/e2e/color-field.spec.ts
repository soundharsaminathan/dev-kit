import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-colorfield--default",
  disabled: "components-colorfield--disabled",
} as const;

test.describe("ColorField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "color-field-default.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "color-field-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("accepts text input", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const field = page.getByRole("textbox", { name: "Hex" });
      await field.focus();
      await field.fill("#ef4444");

      await expect(field).toHaveValue("#ef4444");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
