import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const ADULT_PLAN_IDS = [
  "sub-individual-adult-monthly",
  "sub-individual-adult-quarterly",
];

async function createUniqueBatch(name: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    const start = new Date(Date.UTC(2028, 0, 2 + attempt * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);
    const hour = String(4 + ((stamp + attempt) % 12)).padStart(2, "0");
    const minute = String((stamp + attempt * 11) % 60).padStart(2, "0");
    const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
    const endHour = String(
      Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
    ).padStart(2, "0");

    try {
      return await apiRequest<{ id: string; name: string }>(
        "STAFF",
        "/batches",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STAFF.studioId,
            name,
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
              weekdays: [start.getUTCDay()],
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              startTime: `${hour}:${minute}`,
              endTime: `${endHour}:${endMinute}`,
              utcOffsetMinutes: 0,
            },
            capacity: 12,
            enrollmentMode: "SELF_JOIN",
            subscriptionIds: ADULT_PLAN_IDS,
            active: true,
            certificationEnabled: false,
          }),
        },
      );
    } catch (error) {
      lastError = error;
      if (
        !String(error).includes("409") &&
        !String(error).includes("Conflict")
      ) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not create unique admin batch");
}

test.describe("admin batch management @critical", () => {
  test("staff opens create form and sees API-created batch in list @critical", async ({
    browser,
  }) => {
    const batchName = `E2E Batch ${Date.now()}`;
    const created = await createUniqueBatch(batchName);
    expect(created.id).toBeTruthy();

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();

    try {
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
    } finally {
      await apiRequest("STAFF", `/batches/${created.id}`, {
        method: "DELETE",
      }).catch(() => undefined);
      await context.close();
    }
  });
});
