import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const FUNNEL_TILES = [
  "active",
  "signedInOnly",
  "trialAttended",
  "leftBatch",
] as const;

type FunnelCounts = Record<(typeof FUNNEL_TILES)[number], number>;

async function funnelCountsMatch(
  page: import("@playwright/test").Page,
  period: string,
) {
  const api = await apiRequest<FunnelCounts>(
    "OWNER",
    `/users/studio/${SEED.users.OWNER.studioId}/student-funnel?period=${period}`,
  );
  for (const key of FUNNEL_TILES) {
    const text = await page
      .getByTestId(`funnel-tile-${key}`)
      .locator("strong")
      .textContent();
    if (text !== String(api[key])) return false;
  }
  return true;
}

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

    const currentBatches = page.getByTestId("home-current-batches");
    await expect(currentBatches).toBeVisible();
    await expect(
      currentBatches.getByText("Current batches", { exact: true }),
    ).toBeVisible();
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

    for (const key of FUNNEL_TILES) {
      const tile = page.getByTestId(`funnel-tile-${key}`);
      await expect(tile).toBeVisible();
      await expect(tile.locator("strong")).toHaveText(/^\d+$/);
    }
    // Compare to the live API. A snapshot taken earlier races with other
    // workers that create students while this test switches period.
    await expect.poll(() => funnelCountsMatch(page, "lifetime")).toBe(true);

    await page.getByRole("button", { name: /^this month$/i }).click();
    await expect(
      page.getByRole("button", { name: /^this month$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(funnel).toBeVisible();
    await expect.poll(() => funnelCountsMatch(page, "this_month")).toBe(true);

    await page.getByRole("button", { name: /^lifetime$/i }).click();
    await expect(
      page.getByRole("button", { name: /^lifetime$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => funnelCountsMatch(page, "lifetime")).toBe(true);

    await context.close();
  });
});
