import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-textfield--default",
  withError: "components-textfield--with-error",
} as const;

test.describe("TextField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "text-field-default.png",
      );
    });

    test("with error", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withError,
        "text-field-with-error.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("accepts typed email", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox");
      await input.fill("test@example.com");
      await expect(input).toHaveValue("test@example.com");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("label and description are associated", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Email")).toBeVisible();
      await expect(
        page.getByText("We will send updates to this address."),
      ).toBeVisible();
      await expect(page.locator("[data-textfield]")).toBeVisible();
    });
  });
});
