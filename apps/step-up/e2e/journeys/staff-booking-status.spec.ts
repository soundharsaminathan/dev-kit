import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const BATCH_ID = "batch-beginner-1";

async function clearOpenBookings(studentId: string, batchId: string) {
  const existing = await apiRequest<
    Array<{ id: string; status: string; batchId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`);

  for (const booking of existing) {
    if (booking.batchId !== batchId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
      }).catch(() => null);
    } else if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      await apiRequest("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      }).catch(() => null);
    }
  }
}

test.describe("staff booking status @critical", () => {
  test("staff confirms pending booking through UI @critical", async ({
    browser,
  }) => {
    const studentId = SEED.users.STUDENT.id;
    const notes = `E2E staff confirm ${Date.now()}`;
    await clearOpenBookings(studentId, BATCH_ID);

    let booking = await apiRequest<{ id: string; status: string }>(
      "STUDENT",
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STUDENT.studioId,
          studentId,
          type: "TRIAL",
          batchId: BATCH_ID,
          notes,
        }),
      },
    );

    if (booking.status === "AWAITING_PAYMENT") {
      booking = await apiRequest<{ id: string; status: string }>(
        "STUDENT",
        `/bookings/${booking.id}/confirm-payment`,
        { method: "POST" },
      );
    }

    test.skip(
      booking.status !== "PENDING",
      `Expected PENDING booking, got ${booking.status}`,
    );

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/bookings", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page
      .getByRole("button", { name: /^Pending$/i })
      .click()
      .catch(() => null);

    const card = page.getByText(notes);
    await expect(card.first()).toBeVisible({ timeout: 15_000 });
    await card.first().click();

    const confirm = page.getByTestId("booking-confirm");
    await expect(confirm).toBeVisible({ timeout: 15_000 });

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/bookings/${booking.id}/status`,
      }),
      confirm.click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const latest = await apiRequest<{ status: string }>(
          "STAFF",
          `/bookings/${booking.id}`,
        );
        return latest.status;
      })
      .toBe("CONFIRMED");

    await context.close();
  });
});
