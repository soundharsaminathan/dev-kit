import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-listbox--default",
  multiple: "components-listbox--multiple",
} as const;

test.describe("ListBox", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "list-box-default.png",
      );
    });

    test("multiple", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.multiple,
        "list-box-multiple.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("selects an option on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("option", { name: "Canada" }).click();
      await expect(
        page.getByRole("option", { name: "Canada" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("ArrowDown moves focus through options", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("listbox").focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("option", { name: "Canada" })).toBeFocused();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("united states is selected by default", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("option", { name: "United States" }),
      ).toHaveAttribute("aria-selected", "true");
    });
  });
});
