import { authFile, expect, SMOKE, test, waitForAppReady } from "./fixtures";
import { sweepPaths } from "./route-sweep";

const ADMIN_PATHS = [
  "/admin",
  "/admin/profile",
  "/admin/studios/new",
  `/admin/studios/${SMOKE.studioId}`,
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

  test("system admin can open smoke studio detail @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("SYSTEM_ADMIN"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/admin/studios/${SMOKE.studioId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page).toHaveURL(
        new RegExp(`/admin/studios/${SMOKE.studioId}`),
      );
      await expect(
        page.getByRole("heading", { name: /edit studio|smoke test studio/i }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
