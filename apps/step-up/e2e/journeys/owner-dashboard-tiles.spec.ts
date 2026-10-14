import type { Page, Response } from "@playwright/test";
import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";

const FUNNEL_TILES = [
  "active",
  "signedInOnly",
  "trialAttended",
  "leftBatch",
] as const;

type FunnelCounts = Record<(typeof FUNNEL_TILES)[number], number>;

function isFunnelResponse(response: Response, period: string) {
  if (!response.ok() || response.request().method() !== "GET") return false;
  const url = new URL(response.url());
  return (
    url.pathname.endsWith("/student-funnel") &&
    url.searchParams.get("period") === period
  );
}

/** Assert tiles against the payload this page rendered.
 * A fresh API read races other workers that create students while the
 * dashboard query stays cached. */
async function expectFunnelTiles(page: Page, counts: FunnelCounts) {
  for (const key of FUNNEL_TILES) {
    await expect(
      page.getByTestId(`funnel-tile-${key}`).locator("strong"),
    ).toHaveText(String(counts[key]));
  }
}

test.describe("owner dashboard tiles @critical", () => {
  test("owner home shows name and all tile counts update by period @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    const lifetimeResponse = page.waitForResponse((response) =>
      isFunnelResponse(response, "lifetime"),
    );

    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/?$/);

    const firstName = SEED.users.OWNER.name.split(" ")[0];
    // "Studio" also appears in the account menu ("Studio Owner" / "Studio agent").
    // Match the home subtitle so strict mode has a single element.
    await expect(
      page.getByText(new RegExp(`${firstName} — here's your studio`, "i")),
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

    const lifetimeCounts = (await (
      await lifetimeResponse
    ).json()) as FunnelCounts;
    await expectFunnelTiles(page, lifetimeCounts);

    const monthResponse = page.waitForResponse((response) =>
      isFunnelResponse(response, "this_month"),
    );
    await page.getByRole("button", { name: /^this month$/i }).click();
    await expect(
      page.getByRole("button", { name: /^this month$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(funnel).toBeVisible();
    const monthCounts = (await (await monthResponse).json()) as FunnelCounts;
    await expectFunnelTiles(page, monthCounts);

    await page.getByRole("button", { name: /^lifetime$/i }).click();
    await expect(
      page.getByRole("button", { name: /^lifetime$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectFunnelTiles(page, lifetimeCounts);

    await context.close();
  });
});
