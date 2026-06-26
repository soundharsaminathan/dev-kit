import { expect, test } from "@playwright/test";

test.describe("icon packs", () => {
  test("switches icon pack without breaking search field", async ({ page }) => {
    await page.goto("/components/search-field");

    await page.getByRole("button", { name: "Edit theme" }).click();

    const iconPackSelect = page.getByRole("combobox", { name: "Icon pack" });
    await expect(iconPackSelect).toBeVisible();

    await iconPackSelect.click();
    await page.getByRole("option", { name: "Heroicons Outline" }).click();

    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();

    const materialPacks = [
      {
        label: "Material Symbols Outlined",
        selector: ".material-symbols-outlined",
        font: /Material Symbols Outlined/,
      },
      {
        label: "Material Symbols Rounded",
        selector: ".material-symbols-rounded",
        font: /Material Symbols Rounded/,
      },
      {
        label: "Material Symbols Sharp",
        selector: ".material-symbols-sharp",
        font: /Material Symbols Sharp/,
      },
    ] as const;

    for (const pack of materialPacks) {
      await iconPackSelect.click();
      await page.getByRole("option", { name: pack.label }).click();

      await expect(page.getByRole("searchbox")).toBeVisible();
      const icon = page.locator(pack.selector).first();
      await expect(icon).toBeVisible();
      await expect(icon).toHaveCSS("font-family", pack.font);
    }

    await iconPackSelect.click();
    await page.getByRole("option", { name: "Tabler Outline" }).click();

    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();
  });
});
