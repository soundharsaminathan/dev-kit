import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("staff bookings shell", () => {
  test("staff bookings index loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/bookings");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/bookings/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/booking/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});

test.describe("chat smoke", () => {
  test("student messages index loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/messages");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/messages/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/message|chat|inbox/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});
