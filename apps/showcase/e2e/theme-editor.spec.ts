import { expect, test } from "@playwright/test";

test.describe("Theme editor", () => {
  test("saves a custom theme and persists after reload", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/theme-editor");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Theme editor" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit theme" }).click();
    await expect(
      page.getByRole("heading", { name: "Theme editor", level: 2 }),
    ).toBeVisible();

    await page.getByLabel("Theme name").fill("E2E Custom");
    await page.getByRole("button", { name: "Save theme" }).click();

    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      /^custom-/,
      { timeout: 10_000 },
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Edit theme" }).click();
    await expect(
      page.getByRole("button", { name: "E2E Custom", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      /^custom-/,
    );
  });
});
