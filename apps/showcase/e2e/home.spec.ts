import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("renders landing page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Component Showcase" }),
    ).toBeVisible();
    await expect(
      page.getByText(/interactive playgrounds, compare themes/i),
    ).toBeVisible();
  });

  test("browse components link navigates to catalog", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Browse components" }).click();
    await expect(page).toHaveURL("/components");
    await expect(
      page.getByRole("heading", { name: "Components", exact: true }),
    ).toBeVisible();
  });

  test("compare themes link navigates to themes page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Compare themes" }).click();
    await expect(page).toHaveURL("/themes");
    await expect(page.getByRole("heading", { name: "Themes" })).toBeVisible();
  });
});
