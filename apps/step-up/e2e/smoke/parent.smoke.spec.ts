import { authFile, expect, SMOKE, test, waitForAppReady } from "./fixtures";
import { sweepPaths } from "./route-sweep";

const PARENT_PATHS = [
  "/me",
  "/me/book",
  "/me/bookings",
  "/me/attendance",
  "/me/check-in",
  "/me/subscriptions",
  "/me/invoices",
  "/me/calendar",
  "/me/feed",
  "/me/contests",
  "/me/messages",
  "/me/trainers",
  "/me/locations",
  `/me/locations/${SMOKE.branchMainId}`,
  `/me/batches/${SMOKE.trialBatchId}`,
  "/me/profile",
];

test.describe("parent smoke @smoke", () => {
  test("parent path sweep covers member shell @smoke", async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, PARENT_PATHS);
    } finally {
      await context.close();
    }
  });

  test("parent can view attendance @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me/attendance", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/attendance/);
    } finally {
      await context.close();
    }
  });
});
