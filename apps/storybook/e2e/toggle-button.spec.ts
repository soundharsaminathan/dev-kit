import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-togglebutton--default",
  selected: "components-togglebutton--selected",
  primary: "components-togglebutton--primary",
  quiet: "components-togglebutton--quiet",
  disabled: "components-togglebutton--disabled",
} as const;

test.describe("ToggleButton", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "toggle-button-default.png",
      );
    });

    test("selected", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.selected,
        "toggle-button-selected.png",
      );
    });

    test("primary", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.primary,
        "toggle-button-primary.png",
      );
    });

    test("quiet", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.quiet,
        "toggle-button-quiet.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "toggle-button-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("toggles pressed state on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const button = page.getByRole("button", { name: "Bold" });
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("selected variant starts pressed", async ({ page }) => {
      await gotoStory(page, STORIES.selected);

      await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });
});
