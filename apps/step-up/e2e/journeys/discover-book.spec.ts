import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const TRIAL_BATCH_ID = "batch-trial-1";

async function clearOpenTrialBookings(studentId: string, batchId: string) {
  const existing = await apiRequest<
    Array<{ id: string; status: string; batchId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`);

  for (const booking of existing) {
    if (booking.batchId !== batchId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
      });
    } else if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      await apiRequest("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    }
  }
}

test.describe("discover and book @critical", () => {
  test("student can browse book page and filter UI @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/book", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/book/);
    await expect(
      page.getByRole("heading", { name: /^discover$/i }),
    ).toBeVisible();

    const kids = page.getByRole("button", { name: /^Kids$/i });
    if ((await kids.count()) > 0) {
      await kids.first().click();
    }

    await context.close();
  });

  test("student can create trial booking via API @critical", async () => {
    const studentId = SEED.users.STUDENT.id;
    await clearOpenTrialBookings(studentId, TRIAL_BATCH_ID);

    const created = await apiRequest<{ id: string; status: string }>(
      "STUDENT",
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STUDENT.studioId,
          studentId,
          type: "TRIAL",
          batchId: TRIAL_BATCH_ID,
        }),
      },
    );

    expect(created.id).toBeTruthy();
    expect(["AWAITING_PAYMENT", "PENDING", "CONFIRMED"]).toContain(
      created.status,
    );
  });
});
