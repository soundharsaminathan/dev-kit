import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-switch--default",
  selected: "components-switch--selected",
  small: "components-switch--small",
  large: "components-switch--large",
  disabled: "components-switch--disabled",
} as const;

test.describe("Switch", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "switch-default.png");
    });

    test("selected", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.selected,
        "switch-selected.png",
      );
    });

    test("small", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.small, "switch-small.png");
    });

    test("large", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.large, "switch-large.png");
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "switch-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("toggles on Space key", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const switchControl = page.getByRole("switch", { name: "Notifications" });
      await expect(switchControl).not.toBeChecked();
      await switchControl.focus();
      await page.keyboard.press("Space");
      await expect(switchControl).toBeChecked();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("selected switch is checked", async ({ page }) => {
      await gotoStory(page, STORIES.selected);

      await expect(
        page.getByRole("switch", { name: "Notifications" }),
      ).toBeChecked();
    });
  });
});
