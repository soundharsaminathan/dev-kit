import { expect, test } from "@playwright/test";
import { DEFAULT_GLOBALS, gotoStory } from "./helpers/storybook";

const STORY = "components-searchfield--default";

test.describe("icon packs", () => {
  test("icon pack global switches icons for search field", async ({ page }) => {
    await gotoStory(page, STORY, {
      ...DEFAULT_GLOBALS,
      iconPack: "heroicons-outline",
    });

    const input = page.getByRole("searchbox");
    await expect(input).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();
  });
});
