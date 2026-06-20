import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-dropzone--default",
  disabled: "components-dropzone--disabled",
} as const;

test.describe("DropZone", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "drop-zone-default.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "drop-zone-disabled.png",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("default drop zone is visible", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Drop files here")).toBeVisible();
      await expect(page.locator("[data-drop-zone]")).toBeVisible();
    });

    test("disabled drop zone is marked", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(
        page.locator('[data-drop-zone][data-disabled="true"]'),
      ).toBeVisible();
    });
  });
});
