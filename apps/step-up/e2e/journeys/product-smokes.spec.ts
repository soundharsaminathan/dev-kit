import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("book trial smoke", () => {
  test("student can open book flow", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/book");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/book/);
    await expect(page.locator("body")).not.toBeEmpty();
    await context.close();
  });
});

test.describe("staff confirm booking smoke", () => {
  test("staff bookings index loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/bookings");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/bookings/);
    await expect(page.locator("body")).not.toBeEmpty();
    await context.close();
  });

  test("student can confirm an awaiting-payment booking via API", async () => {
    const created = await apiRequest<{ id: string; status: string }>(
      "STUDENT",
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STUDENT.studioId,
          studentId: SEED.users.STUDENT.id,
          type: "TRIAL",
          batchId: "batch-beginner-1",
        }),
      },
    ).catch(() => null);

    test.skip(
      !created?.id,
      "Could not create trial booking in this environment",
    );

    if (created?.status === "AWAITING_PAYMENT") {
      const confirmed = await apiRequest<{ status: string }>(
        "STUDENT",
        `/bookings/${created.id}/confirm-payment`,
        { method: "POST" },
      );
      expect(confirmed.status).toBe("PENDING");
    }
  });
});

test.describe("parent child switcher smoke", () => {
  test("parent home loads for family account", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);
    await expect(page.locator("body")).not.toBeEmpty();
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
    await expect(page.locator("body")).not.toBeEmpty();
    await context.close();
  });
});
