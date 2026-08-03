import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";

/** Seed trial batch — self-join for Try 2 sessions CTA. */
const TRIAL_BATCH_ID = SEED.trialBatchId;

const ADULT_PLAN_IDS = [
  "sub-individual-adult-monthly",
  "sub-individual-adult-quarterly",
];

async function clearOpenBookings(studentId: string, batchId: string) {
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

/** Ephemeral STAFF_ONLY batch — avoids dirty enrollments on shared seed batches. */
async function createBookableBatch() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    const start = new Date(Date.UTC(2028, 5, 4 + attempt * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);
    const hour = String(8 + ((stamp + attempt) % 8)).padStart(2, "0");
    const minute = String((stamp + attempt * 13) % 60).padStart(2, "0");
    const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
    const endHour = String(
      Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
    ).padStart(2, "0");

    try {
      return await apiRequest<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `E2E Book ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80",
          category: "ADULTS",
          branchId: "branch-main-1",
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "E2E bookable class" },
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
          enrollmentMode: "STAFF_ONLY",
          subscriptionIds: ADULT_PLAN_IDS,
          active: true,
          certificationEnabled: false,
        }),
      });
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
    : new Error("Could not create bookable batch");
}

test.describe("discover and book @critical", () => {
  test("student books class through UI @critical", async ({ browser }) => {
    const studentId = SEED.users.STUDENT.id;
    const cleanup = new TestDataCleanup();
    const batch = await createBookableBatch();
    cleanup.trackBatch(batch.id);
    await clearOpenBookings(studentId, batch.id);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/me/batches/${batch.id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const bookCta = page.getByTestId("book-class-cta");
      await expect(bookCta).toBeVisible();
      await expect(bookCta).toHaveText(/book this class/i);
      await bookCta.click();

      const submit = page.getByTestId("book-submit");
      await expect(submit).toBeVisible();

      const [response] = await Promise.all([
        waitForApiResponse(page, { method: "POST", pathIncludes: "/bookings" }),
        submit.click(),
      ]);
      expect(response.ok()).toBeTruthy();

      const body = (await response.json()) as { status?: string; id?: string };
      if (body.status === "AWAITING_PAYMENT") {
        await expect(page).toHaveURL(/\/me\/checkout\//);
        await expect(page.getByTestId("checkout-pay")).toBeVisible();
      } else {
        await expect(
          page.getByText(/request|booked|pending|success/i).first(),
        ).toBeVisible();
      }
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("student can try self-enroll class through UI @critical", async ({
    browser,
  }) => {
    const studentId = SEED.users.STUDENT.id;
    await clearOpenBookings(studentId, TRIAL_BATCH_ID);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto(`/me/batches/${TRIAL_BATCH_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const trialCta = page.getByTestId("trial-enroll-cta");
    const trialUsed = page.getByRole("button", { name: /trial already used/i });
    const enrolledCopy = page.getByText(
      /enrolled|you're in|joined|member|trial enrollment|trial covers/i,
    );
    // Wait for either the trial CTA or an already-used / enrolled state.
    await expect(trialCta.or(trialUsed).or(enrolledCopy.first())).toBeVisible();
    if ((await trialCta.count()) === 0) {
      await context.close();
      return;
    }

    await expect(trialCta).toHaveText(/try 2 sessions/i);
    await trialCta.click();

    const submit = page.getByTestId("enroll-submit");
    await expect(submit).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/batches/${TRIAL_BATCH_ID}/enroll`,
      }),
      submit.click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(
      page.getByText(/enrolled|joined|trial/i).first(),
    ).toBeVisible();

    await context.close();
  });

  test("student can browse book page and filter UI", async ({ browser }) => {
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
});
