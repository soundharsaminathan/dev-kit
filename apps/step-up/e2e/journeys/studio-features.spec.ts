import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";
import { expectOk } from "../http/helpers";

async function setFeature(key: string, enabled: boolean) {
  await expectOk("SYSTEM_ADMIN", `/studios/${SEED.studioId}/features/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

test.describe("studio features journey @critical", () => {
  test("disable bookings hides nav and blocks direct URL @critical", async ({
    browser,
  }) => {
    await setFeature("bookings", false);
    try {
      const context = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      const page = await context.newPage();
      try {
        await page.goto("/app");
        await waitForAppReady(page);
        await expect(page.locator('a[href^="/app/bookings"]')).toHaveCount(0);

        await page.goto("/app/bookings");
        await waitForAppReady(page);
        await expect(
          page.getByRole("heading", { name: /feature unavailable/i }),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      await setFeature("bookings", true);
    }

    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app");
      await waitForAppReady(page);
      await expect(page.locator('a[href^="/app/bookings"]')).not.toHaveCount(0);
      await page.goto("/app/bookings");
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: /feature unavailable/i }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("disable chat and contests from other categories @critical", async ({
    browser,
  }) => {
    await setFeature("chat", false);
    await setFeature("contests", false);
    await setFeature("expenses", false);
    try {
      const context = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      const page = await context.newPage();
      try {
        await page.goto("/app");
        await waitForAppReady(page);
        await expect(page.locator('a[href="/app/messages"]')).toHaveCount(0);
        await expect(page.locator('a[href="/app/contests"]')).toHaveCount(0);
        await expect(page.locator('a[href="/app/expenses"]')).toHaveCount(0);

        await page.goto("/app/messages");
        await waitForAppReady(page);
        await expect(
          page.getByRole("heading", { name: /feature unavailable/i }),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      await setFeature("chat", true);
      await setFeature("contests", true);
      await setFeature("expenses", true);
    }
  });

  test("system admin features page lists toggles @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("SYSTEM_ADMIN"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/admin/studios/${SEED.studioId}/features`);
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: "Studio features", exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("feature-toggle-bookings")).toBeVisible();
      await expect(page.getByTestId("feature-toggle-chat")).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
