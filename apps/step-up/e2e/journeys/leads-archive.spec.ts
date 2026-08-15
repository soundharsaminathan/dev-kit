import type { Page } from "@playwright/test";
import {
  apiRequest,
  authFile,
  expect,
  TestDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const STUDIO_ID = SEED.users.STAFF.studioId;

async function createNewLead(cleanup: TestDataCleanup) {
  const stamp = Date.now();
  const lead = await apiRequest<{ id: string; name: string }>(
    "STAFF",
    `/users/studio/${STUDIO_ID}/leads`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `E2E Archive ${stamp}`,
        phone: `900${String(stamp).slice(-7)}`,
        ageRange: "TWENTY_TO_FORTY",
      }),
    },
  );
  cleanup.trackStudent(lead.id);
  return lead;
}

async function openLeadsOnMobile(page: Page, name: string, leadId: string) {
  await page.goto("/app/leads", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("searchbox", { name: "Search leads" }).fill(name);
  await expect(page.getByTestId(`lead-card-${leadId}`)).toBeVisible({
    timeout: 30_000,
  });
}

async function swipeLeadCard(page: Page, leadId: string, dx: number) {
  const card = page.getByTestId(`lead-card-${leadId}`);
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) {
    throw new Error(`lead-card-${leadId} has no bounding box`);
  }
  const startX = box.x + Math.min(96, box.width * 0.35);
  const y = box.y + Math.min(28, box.height / 3);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + dx, y, { steps: 24 });
  await page.mouse.up();
}

async function leadSection(name: string, leadId: string) {
  const page = await apiRequest<{
    items: Array<{ id: string; section: string }>;
  }>(
    "STAFF",
    `/users/studio/${STUDIO_ID}/leads?q=${encodeURIComponent(name)}&limit=25`,
  );
  return page.items.find((item) => item.id === leadId);
}

test.describe("trial caller swipe archive @critical", () => {
  test("staff swipes to archive then unarchive a lead on mobile @critical", async ({
    browser,
  }) => {
    const cleanup = new TestDataCleanup();
    const lead = await createNewLead(cleanup);

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
      viewport: { width: 393, height: 851 },
    });
    const page = await context.newPage();
    try {
      await openLeadsOnMobile(page, lead.name, lead.id);

      const [archiveResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        }),
        swipeLeadCard(page, lead.id, -180),
      ]);
      expect(archiveResponse.ok()).toBeTruthy();

      await expect
        .poll(async () => (await leadSection(lead.name, lead.id))?.section)
        .toBe("archived");

      await page.getByTestId("leads-section-archived").click();
      await expect(page.getByTestId(`lead-card-${lead.id}`)).toBeVisible({
        timeout: 30_000,
      });

      const [unarchiveResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        }),
        swipeLeadCard(page, lead.id, 180),
      ]);
      expect(unarchiveResponse.ok()).toBeTruthy();

      await expect
        .poll(async () => (await leadSection(lead.name, lead.id))?.section)
        .toBe("new");

      await page.getByTestId("leads-filter-all").click();
      await expect(page.getByTestId(`lead-card-${lead.id}`)).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });
});
