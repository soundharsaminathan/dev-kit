import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-togglebuttongroup--default",
} as const;

test.describe("ToggleButtonGroup", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "toggle-button-group-default.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("selects a different toggle on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const italic = page.getByRole("radio", { name: "Italic" });
      await italic.click();
      await expect(italic).toHaveAttribute("aria-checked", "true");
      await expect(page.getByRole("radio", { name: "Bold" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("bold is selected by default", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("radio", { name: "Bold" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });
});
