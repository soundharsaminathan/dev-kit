import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("header links route between main pages", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", {
        name: "Components",
      })
      .click();
    await expect(page).toHaveURL("/components");

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", {
        name: "Themes",
      })
      .click();
    await expect(page).toHaveURL("/themes");

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", {
        name: "Home",
      })
      .click();
    await expect(page).toHaveURL("/");
  });

  test("logo navigates home", async ({ page }) => {
    await page.goto("/components");
    await page.getByRole("link", { name: "Component Showcase" }).click();
    await expect(page).toHaveURL("/");
  });
});
