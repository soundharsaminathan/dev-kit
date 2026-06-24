import { expect, test } from "@playwright/test";

test.describe("Component detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/button");
  });

  test("renders playground and controls", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Button", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Playground")).toBeVisible();
    await expect(page.getByRole("button", { name: "Button" })).toBeVisible();
    await expect(page.getByText("Label")).toBeVisible();
  });

  test("control changes update the preview", async ({ page }) => {
    const labelInput = page.getByRole("textbox");
    await labelInput.fill("Save");
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("pager links navigate between components", async ({ page }) => {
    await page.getByRole("link", { name: /Toggle Button →/ }).click();
    await expect(page).toHaveURL("/components/toggle-button");
  });
});
