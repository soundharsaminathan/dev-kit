import { expect, type Page, test } from "@playwright/test";
import { getDemoFrame, gotoShowcasePage } from "./helpers/screenshots";

function getIconPackTrigger(page: Page) {
  return page.getByRole("button", { name: / Icon pack$/ });
}

async function selectIconPack(page: Page, label: string) {
  await getIconPackTrigger(page).click();
  await page.getByRole("option", { name: label }).click();
}

async function expectDemoSearchIcon(
  page: Page,
  selector: string,
  font?: RegExp,
) {
  await page.waitForLoadState("networkidle");
  const icon = getDemoFrame(page)
    .locator("[data-search-field-group]")
    .locator(selector)
    .first();
  await expect(icon).toBeVisible({ timeout: 30_000 });
  if (font) {
    await expect(icon).toHaveCSS("font-family", font);
  }
}

test.describe("icon packs", () => {
  test("switches icon pack without breaking search field", async ({ page }) => {
    test.setTimeout(120_000);

    await gotoShowcasePage(page, "/components/search-field");

    await page.getByRole("button", { name: "Edit theme" }).click();
    await expect(
      page.getByRole("heading", { name: "Theme editor", level: 2 }),
    ).toBeVisible();

    await expect(getIconPackTrigger(page)).toBeVisible();

    await selectIconPack(page, "Heroicons Outline");
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expectDemoSearchIcon(page, "svg");

    await page.getByRole("button", { name: "Edit theme" }).click();
    await expect(
      page.getByRole("heading", { name: "Theme editor", level: 2 }),
    ).toBeVisible();

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
      await selectIconPack(page, pack.label);
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByRole("searchbox")).toBeVisible();
      await expectDemoSearchIcon(page, pack.selector, pack.font);

      await page.getByRole("button", { name: "Edit theme" }).click();
      await expect(
        page.getByRole("heading", { name: "Theme editor", level: 2 }),
      ).toBeVisible();
    }

    await selectIconPack(page, "Tabler Outline");
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expectDemoSearchIcon(page, "svg");
  });
});
