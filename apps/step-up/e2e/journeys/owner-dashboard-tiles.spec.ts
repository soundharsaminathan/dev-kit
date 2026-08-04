import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";

const FUNNEL_TILES = [
  "active",
  "signedInOnly",
  "trialAttended",
  "completedWithoutPlan",
] as const;

test.describe("owner dashboard tiles @critical", () => {
  test("owner home shows name and all tile counts update by period @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();

    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/?$/);

    const firstName = SEED.users.OWNER.name.split(" ")[0];
    await expect(
      page.getByText(new RegExp(`${firstName}.*studio`, "i")),
    ).toBeVisible();

    const metrics = page.getByTestId("owner-metric-tiles");
    await expect(metrics).toBeVisible();
    for (const label of ["Batches", "Students", "Trainers", "Subscriptions"]) {
      await expect(metrics.getByText(label, { exact: true })).toBeVisible();
    }
    await expect
      .poll(async () => metrics.locator("strong").count())
      .toBeGreaterThanOrEqual(4);
    for (const strong of await metrics.locator("strong").all()) {
      await expect(strong).toHaveText(/^\d+$/);
    }

    const pipeline = page.getByTestId("student-pipeline");
    await expect(pipeline).toBeVisible();
    const funnel = page.getByTestId("funnel-tiles");
    await expect(funnel).toBeVisible();

    const lifetimeCounts: Record<string, string> = {};
    for (const key of FUNNEL_TILES) {
      const tile = page.getByTestId(`funnel-tile-${key}`);
      await expect(tile).toBeVisible();
      const value = tile.locator("strong");
      await expect(value).toHaveText(/^\d+$/);
      lifetimeCounts[key] = (await value.textContent()) ?? "";
    }

    await page.getByRole("button", { name: /^this month$/i }).click();
    await expect(funnel).toBeVisible();

    for (const key of FUNNEL_TILES) {
      const tile = page.getByTestId(`funnel-tile-${key}`);
      await expect(tile).toBeVisible();
      await expect(tile.locator("strong")).toHaveText(/^\d+$/);
    }

    await page.getByRole("button", { name: /^lifetime$/i }).click();
    for (const key of FUNNEL_TILES) {
      const tile = page.getByTestId(`funnel-tile-${key}`);
      await expect(tile.locator("strong")).toHaveText(lifetimeCounts[key]!);
    }

    await context.close();
  });
});
