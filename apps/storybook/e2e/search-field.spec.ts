import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-searchfield--default",
  withLabel: "components-searchfield--with-label",
  disabled: "components-searchfield--disabled",
} as const;

test.describe("SearchField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "search-field-default.png",
      );
    });

    test("with label", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withLabel,
        "search-field-with-label.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "search-field-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("accepts search query", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("searchbox");
      await input.fill("components");
      await expect(input).toHaveValue("components");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("disabled search field is not editable", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(
        page.getByRole("searchbox", { name: "Search" }),
      ).toBeDisabled();
    });
  });
});
