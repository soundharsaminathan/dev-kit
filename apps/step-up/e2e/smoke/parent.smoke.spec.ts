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

  test("parent switches active child @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      const switcher = page.getByTestId("child-switcher");
      await expect(switcher).toBeVisible();

      const childChip = page.getByTestId(
        `child-switch-${SMOKE.users.STUDENT.id}`,
      );
      await expect(childChip).toBeVisible();
      await childChip.click();
      await expect(childChip).toHaveAttribute("aria-pressed", "true");

      const selfChip = page.getByTestId(
        `child-switch-${SMOKE.users.PARENT.id}`,
      );
      if ((await selfChip.count()) > 0) {
        await selfChip.click();
        await expect(selfChip).toHaveAttribute("aria-pressed", "true");
      }
    } finally {
      await context.close();
    }
  });

  test("parent can view child attendance @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      const childChip = page.getByTestId(
        `child-switch-${SMOKE.users.STUDENT.id}`,
      );
      if ((await childChip.count()) > 0) {
        await childChip.click();
      }
      await page.goto("/me/attendance", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/attendance/);
    } finally {
      await context.close();
    }
  });
});
