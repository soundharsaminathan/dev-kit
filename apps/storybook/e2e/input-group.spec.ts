import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-inputgroup--default",
  withTrailingAddon: "components-inputgroup--with-trailing-addon",
} as const;

test.describe("InputGroup", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "input-group-default.png",
      );
    });

    test("with trailing addon", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withTrailingAddon,
        "input-group-with-trailing-addon.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("input accepts text with leading addon", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox", { name: "Website" });
      await input.fill("example.com");
      await expect(input).toHaveValue("example.com");
      await expect(page.getByText("https://")).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
