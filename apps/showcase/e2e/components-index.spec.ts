import { expect, test } from "@playwright/test";

test.describe("Components index", () => {
  test("lists categories and component cards", async ({ page }) => {
    await page.goto("/components");

    await expect(
      page.getByRole("heading", { name: "Components", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Buttons" }),
    ).toBeVisible();
    await expect(page.locator('[data-component="button"]')).toBeVisible();
  });

  test("card click opens component detail", async ({ page }) => {
    await page.goto("/components");
    await page.locator('[data-component="button"]').click();
    await expect(page).toHaveURL("/components/button");
    await expect(
      page.getByRole("heading", { name: "Button", exact: true }),
    ).toBeVisible();
  });

  test("sidebar links to component detail", async ({ page }) => {
    await page.goto("/components");
    await page
      .getByRole("navigation", { name: "Components" })
      .getByRole("link", { name: "Button", exact: true })
      .click();
    await expect(page).toHaveURL("/components/button");
  });
});
