import { expect, test } from "@playwright/test";

test.describe("Themes", () => {
  test("renders light and dark preset grids", async ({ page }) => {
    await page.goto("/themes");

    await expect(
      page.getByRole("heading", { name: "Theme presets" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Light mode" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Dark mode" }),
    ).toBeVisible();
    await expect(page.locator("[data-theme-preset]").first()).toBeVisible();
  });

  test("header theme controls update document attributes", async ({ page }) => {
    await page.goto("/themes");

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-mode",
      "dark",
    );

    await page.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-mode",
      "light",
    );
  });
});
