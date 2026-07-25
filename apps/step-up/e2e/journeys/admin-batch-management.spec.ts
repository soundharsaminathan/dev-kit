import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("admin batch management @critical", () => {
  test("staff opens create form and sees API-created batch in list @critical", async ({
    browser,
  }) => {
    const batchName = `E2E Batch ${Date.now()}`;
    const created = await apiRequest<{ id: string; name: string }>(
      "STAFF",
      "/batches",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: batchName,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: "branch-main-1",
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "E2E created batch" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [0],
            startDate: "2027-04-04",
            endDate: "2027-06-27",
            startTime: "05:45",
            endTime: "06:30",
            utcOffsetMinutes: 0,
          },
          capacity: 12,
          enrollmentMode: "SELF_JOIN",
          subscriptionIds: [
            "sub-individual-adult-monthly",
            "sub-individual-adult-quarterly",
          ],
          active: true,
          certificationEnabled: false,
        }),
      },
    );
    expect(created.id).toBeTruthy();

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();

    await page.goto("/app/batches/new", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /new batch/i }),
    ).toBeVisible();

    await page.goto("/app/batches", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /^batches$/i }),
    ).toBeVisible();
    await expect(page.getByText(batchName)).toBeVisible();

    await context.close();
  });
});
