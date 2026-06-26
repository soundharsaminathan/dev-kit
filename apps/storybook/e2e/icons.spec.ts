import { expect, test } from "@playwright/test";
import { gotoStory } from "./helpers/storybook";

const STORY = "components-searchfield--default";

test.describe("icon packs", () => {
  test("toolbar switches icon pack for search field", async ({ page }) => {
    await gotoStory(page, STORY);

    await page.getByRole("button", { name: "Icons" }).click();
    await page.getByRole("option", { name: "Heroicons Outline" }).click();

    const input = page.getByRole("searchbox");
    await expect(input).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();
  });
});
