import {
  apiRequest,
  authFile,
  expect,
  SMOKE,
  test,
  waitForAppReady,
} from "./fixtures";
import { sweepPaths } from "./route-sweep";

const ADMIN_PATHS = [
  "/admin",
  "/admin/profile",
  "/admin/studios/new",
  `/admin/studios/${SMOKE.studioId}`,
  `/admin/studios/${SMOKE.studioId}/features`,
  `/admin/studios/${SMOKE.studioId}/invoices`,
];

test.describe("system admin smoke @smoke", () => {
  test("system admin path sweep covers /admin shell @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("SYSTEM_ADMIN"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, ADMIN_PATHS);
    } finally {
      await context.close();
    }
  });

  test("system admin studios list and create wizard @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("SYSTEM_ADMIN"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: "Studios", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create studio" }),
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Create login page link" }),
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Create login page link" })
        .click();
      await expect(page.getByText("Login page link").first()).toBeVisible();
      const loginLink = page.getByTestId("login-page-link-url");
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toContainText("/login?direct=1");
      await expect(page.getByText(/username and password only/i)).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click();

      await page.getByRole("button", { name: "Create studio" }).click();
      await expect(page).toHaveURL(/\/admin\/studios\/new\/?$/);
      await expect(
        page.getByRole("heading", { name: "Details", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Studio name")).toBeVisible();
      // Do not submit — avoid creating real studios in production DB.
    } finally {
      await context.close();
    }
  });

  test("system admin can open features page and toggle bookings restore @smoke", async ({
    browser,
  }) => {
    await apiRequest(
      "SYSTEM_ADMIN",
      `/studios/${SMOKE.studioId}/features/bookings`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      },
    );
    try {
      const adminContext = await browser.newContext({
        storageState: authFile("SYSTEM_ADMIN"),
      });
      const adminPage = await adminContext.newPage();
      try {
        await adminPage.goto(`/admin/studios/${SMOKE.studioId}/features`, {
          waitUntil: "domcontentloaded",
        });
        await waitForAppReady(adminPage);
        await expect(
          adminPage.getByRole("heading", {
            name: "Studio features",
            exact: true,
          }),
        ).toBeVisible();
      } finally {
        await adminContext.close();
      }

      const ownerContext = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      const ownerPage = await ownerContext.newPage();
      try {
        await ownerPage.goto("/app", { waitUntil: "domcontentloaded" });
        await waitForAppReady(ownerPage);
        await expect(ownerPage.locator('a[href="/app/bookings"]')).toHaveCount(
          0,
        );
        await ownerPage.goto("/app/bookings", {
          waitUntil: "domcontentloaded",
        });
        await waitForAppReady(ownerPage);
        await expect(
          ownerPage.getByRole("heading", { name: /feature unavailable/i }),
        ).toBeVisible();
      } finally {
        await ownerContext.close();
      }
    } finally {
      await apiRequest(
        "SYSTEM_ADMIN",
        `/studios/${SMOKE.studioId}/features/bookings`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: true }),
        },
      );
    }
  });
});
