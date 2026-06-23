import { expect, test } from "@playwright/test";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-meter--default",
} as const;

test.describe("Meter", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "meter-default.png");
    });
  });

  test.describe("interactions", () => {
    test("renders meter with label", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("meter", { name: "Storage used" }),
      ).toBeVisible();
    });
  });
});
