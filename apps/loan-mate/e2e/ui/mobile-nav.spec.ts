import { expect, test } from "@playwright/test";
import { SESSION_STORAGE_KEY } from "../../src/lib/constants";

const session = {
  token: "e2e-token",
  user: {
    id: "user-1",
    email: "owner@loan-mate.local",
    name: "Company Owner",
    role: "COMPANY_OWNER",
    companyId: "company-1",
  },
};

test.describe("mobile nav", () => {
  test("a tap in the menu opens that page", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [SESSION_STORAGE_KEY, JSON.stringify(session)] as const,
    );

    await page.goto("/app");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).tap();

    const nav = page.getByRole("navigation", { name: "Sidebar" });
    const home = nav.getByRole("link", { name: "Home", exact: true });
    const customers = nav.getByRole("link", { name: "Customers", exact: true });
    await expect(customers).toBeVisible();

    const homeBox = await home.boundingBox();
    const customersBox = await customers.boundingBox();
    expect(homeBox).not.toBeNull();
    expect(customersBox).not.toBeNull();
    expect(Math.abs((homeBox?.width ?? 0) - (customersBox?.width ?? 0))).toBeLessThan(2);
    expect(homeBox?.height ?? 0).toBeGreaterThan(32);

    await customers.tap();

    await expect(page).toHaveURL(/\/app\/customers\/?$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Customers" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});
