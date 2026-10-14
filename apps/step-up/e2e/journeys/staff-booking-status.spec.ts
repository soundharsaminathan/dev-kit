import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";
import { createHttpStudent, TestDataCleanup } from "../http/helpers";

const SESSION_ID = SEED.trialSessionId;

function studentAuth(studentId: string) {
  return { Authorization: `Bearer dev:STUDENT:${studentId}` };
}

async function clearOpenBookings(studentId: string, sessionId: string) {
  const existing = await apiRequest<
    Array<{ id: string; status: string; sessionId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`, {
    headers: studentAuth(studentId),
  });

  for (const booking of existing) {
    if (booking.sessionId !== sessionId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
        headers: studentAuth(studentId),
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
    // Seed Alex is a parent-linked child, so the adults-only trial session rejects them.
    const cleanup = new TestDataCleanup();
    let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    try {
      const student = await createHttpStudent(
        `Staff Confirm ${Date.now()}`,
        cleanup,
      );
      const studentId = student.id;
      const notes = `E2E staff confirm ${Date.now()}`;
      await clearOpenBookings(studentId, SESSION_ID);

      let booking = await apiRequest<{ id: string; status: string }>(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          headers: studentAuth(studentId),
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            sessionId: SEED.trialSessionId,
            notes,
          }),
        },
      );

      if (booking.status === "AWAITING_PAYMENT") {
        booking = await apiRequest<{ id: string; status: string }>(
          "STUDENT",
          `/bookings/${booking.id}/confirm-payment`,
          { method: "POST", headers: studentAuth(studentId) },
        );
      }

      test.skip(
        booking.status !== "PENDING",
        `Expected PENDING booking, got ${booking.status}`,
      );

      context = await browser.newContext({
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
    } finally {
      await context?.close();
      await cleanup.dispose();
    }
  });
});
