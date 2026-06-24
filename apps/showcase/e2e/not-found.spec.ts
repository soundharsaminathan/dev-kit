import { expect, test } from "@playwright/test";

test.describe("Not found", () => {
  test("unknown component slug shows not found page", async ({ page }) => {
    await page.goto("/components/not-a-real-component");
    await expect(
      page.getByRole("heading", { name: "Component not found" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to components" }).click();
    await expect(page).toHaveURL("/components");
  });
});
