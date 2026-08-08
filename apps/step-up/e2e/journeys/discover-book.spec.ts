import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { AUTH_STORAGE_KEY, SEED } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";

/** E2E trial batch — self-join for Request trial CTA. */
const TRIAL_BATCH_ID = SEED.trialBatchId;

/**
 * Self-signup student with onboarding done — OWNER `/users` students start
 * with `mustChangePassword` and no `onboardingCompletedAt`, so bypass
 * impersonation would land on change-password / onboarding instead of the batch.
 */
async function createTrialReadyStudent() {
  const stamp = Date.now();
  const id = `dev-trial-request-${stamp}`;
  const email = `trial-request-${stamp}@stepup.dev`;
  const name = `Trial Request ${stamp}`;

  const student = await apiRequest<{
    id: string;
    email: string;
    name: string;
    studioId: string | null;
  }>("OWNER", "/auth/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer dev:STUDENT:${id}`,
    },
    body: JSON.stringify({
      name,
      email,
      studioId: SEED.studioId,
    }),
  });

  await apiRequest("STUDENT", "/users/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer dev:STUDENT:${student.id}`,
    },
    body: JSON.stringify({
      name,
      gender: "FEMALE",
      ageRange: "TWENTY_TO_FORTY",
      experienceLevel: "BEGINNER",
      styles: ["Hip Hop"],
    }),
  });

  await apiRequest("STUDENT", "/users/me/onboarding/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer dev:STUDENT:${student.id}`,
    },
    body: JSON.stringify({}),
  });

  return student;
}

async function clearOpenBookings(studentId: string, batchId: string) {
  const existing = await apiRequest<
    Array<{
      id: string;
      status: string;
      batchId: string | null;
      sessionId: string | null;
    }>
  >("STUDENT", `/bookings/student/${studentId}`);

  for (const booking of existing) {
    const matchesBatch = booking.batchId === batchId;
    const matchesSession = booking.sessionId === SEED.trialSessionId;
    if (!matchesBatch && !matchesSession) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
      });
    } else if (
      booking.status === "PENDING" ||
      booking.status === "CONFIRMED" ||
      booking.status === "COMPLETED"
    ) {
      await apiRequest("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      }).catch(() => null);
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
          branchId: SEED.branchMainId,
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
          subscriptionIds: [...SEED.adultPlanIds],
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
      await expect(bookCta).toBeEnabled();
      await bookCta.click();

      const submit = page.getByTestId("book-submit");
      // Sheet open can race first paint; retry the CTA once if needed.
      if (!(await submit.isVisible().catch(() => false))) {
        await bookCta.click();
      }
      await expect(submit).toBeVisible({ timeout: 15_000 });
      await expect(submit).toBeEnabled();

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

  test("student can request a trial session through UI @critical", async ({
    browser,
  }) => {
    const cleanup = new TestDataCleanup();
    const student = await createTrialReadyStudent();
    cleanup.trackStudent(student.id);
    await clearOpenBookings(student.id, TRIAL_BATCH_ID);

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      {
        key: AUTH_STORAGE_KEY,
        value: {
          id: student.id,
          email: student.email,
          name: student.name,
          role: "STUDENT",
          studioId: student.studioId ?? SEED.studioId,
          styles: ["Hip Hop"],
          experienceLevel: "BEGINNER",
          gender: "FEMALE",
          ageRange: "TWENTY_TO_FORTY",
          onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
          mustChangePassword: false,
        },
      },
    );

    try {
      await page.goto(`/me/batches/${TRIAL_BATCH_ID}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page).toHaveURL(new RegExp(`/me/batches/${TRIAL_BATCH_ID}`));

      const trialCta = page.getByTestId("trial-booking-cta");
      await expect(trialCta).toBeVisible();
      await expect(trialCta).toHaveText(/request trial/i);
      await trialCta.click();

      const sessionSelect = page.getByTestId("trial-session-select");
      await expect(sessionSelect).toBeVisible();
      await sessionSelect.click();
      await page.getByRole("option").first().click();

      const submit = page.getByTestId("book-submit");
      await expect(submit).toBeEnabled();

      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/bookings",
        }),
        submit.click(),
      ]);
      expect(response.ok()).toBeTruthy();
      await expect(
        page
          .getByText(
            /trial requested|requested|pending|submitted|request sent/i,
          )
          .first(),
      ).toBeVisible();
    } finally {
      await context.close();
      await cleanup.dispose();
    }
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
