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

async function leadSection(name: string, leadId: string, section: string) {
  const page = await apiRequest<{
    items: Array<{ id: string; section: string }>;
  }>(
    "STAFF",
    `/users/studio/${STUDIO_ID}/leads?section=${section}&q=${encodeURIComponent(name)}&limit=25`,
  );
  return page.items.find((item) => item.id === leadId);
}

test.describe("trial caller sheet archive @critical", () => {
  test("staff archives then unarchives a lead from the sheet @critical", async ({
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

      await page.getByTestId(`lead-open-${lead.id}`).click();
      const [archiveResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        }),
        page.getByTestId(`lead-archive-${lead.id}`).click(),
      ]);
      expect(archiveResponse.ok()).toBeTruthy();

      await expect
        .poll(
          async () =>
            (await leadSection(lead.name, lead.id, "archived"))?.section,
        )
        .toBe("archived");

      await page.goto("/app/leads?section=archived", {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await page
        .getByRole("searchbox", { name: "Search leads" })
        .fill(lead.name);
      await expect(page.getByTestId(`lead-card-${lead.id}`)).toBeVisible({
        timeout: 30_000,
      });

      await page.getByTestId(`lead-open-${lead.id}`).click();
      const [unarchiveResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        }),
        page.getByTestId(`lead-unarchive-${lead.id}`).click(),
      ]);
      expect(unarchiveResponse.ok()).toBeTruthy();

      await expect
        .poll(
          async () => (await leadSection(lead.name, lead.id, "new"))?.section,
        )
        .toBe("new");

      await page.goto("/app/leads?section=new", {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await page
        .getByRole("searchbox", { name: "Search leads" })
        .fill(lead.name);
      await expect(page.getByTestId(`lead-card-${lead.id}`)).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("staff posts a remark and the follow-up chip updates @critical", async ({
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
      await expect(page.getByTestId(`lead-followup-${lead.id}`)).toHaveText(
        "No follow-up",
      );

      await page.getByTestId(`lead-open-${lead.id}`).click();
      await page.getByTestId("lead-remark-input").fill("Called, will visit");
      const [remarkResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/users/studio/${STUDIO_ID}/leads/${lead.id}/remarks`,
        }),
        page.getByTestId("lead-remark-send").click(),
      ]);
      expect(remarkResponse.ok()).toBeTruthy();
      await expect(page.getByText("Called, will visit")).toBeVisible();

      await page.keyboard.press("Escape");
      await expect
        .poll(async () =>
          page.getByTestId(`lead-followup-${lead.id}`).textContent(),
        )
        .not.toBe("No follow-up");
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });
});
