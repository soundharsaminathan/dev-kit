import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-textarea--default",
  withField: "components-textarea--with-field",
  disabled: "components-textarea--disabled",
} as const;

test.describe("TextArea", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "text-area-default.png",
      );
    });

    test("with field", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withField,
        "text-area-with-field.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "text-area-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("accepts multiline text", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const textarea = page.getByRole("textbox", { name: "Message" });
      await textarea.fill("Hello\nWorld");
      await expect(textarea).toHaveValue("Hello\nWorld");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("disabled textarea is not editable", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(
        page.getByRole("textbox", { name: "Message" }),
      ).toBeDisabled();
    });
  });
});
