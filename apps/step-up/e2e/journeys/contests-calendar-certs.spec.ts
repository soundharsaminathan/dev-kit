import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("contests calendar certificates", () => {
  test("staff contests index loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/contests", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/contests/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/contest/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });

  test("staff calendar loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/calendar", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/calendar/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/calendar|week|month|today/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });

  test("member calendar loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/calendar", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/calendar/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/calendar|schedule|class/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });

  test("staff certificates index loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/certificates", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/certificates/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/certificate|template/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});
