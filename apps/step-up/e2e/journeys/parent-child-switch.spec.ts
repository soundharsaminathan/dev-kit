import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("parent child switch @critical", () => {
  test("parent switches active child on home @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("PARENT"),
    });
    const page = await context.newPage();
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);

    const switcher = page.getByTestId("child-switcher");
    await expect(switcher).toBeVisible();

    const childChip = page.getByTestId(`child-switch-${SEED.users.STUDENT.id}`);
    await expect(childChip).toBeVisible();
    await childChip.click();
    await expect(childChip).toHaveAttribute("aria-pressed", "true");

    const selfChip = page.getByTestId(`child-switch-${SEED.users.PARENT.id}`);
    if ((await selfChip.count()) > 0) {
      await selfChip.click();
      await expect(selfChip).toHaveAttribute("aria-pressed", "true");
    }

    await context.close();
  });
});
