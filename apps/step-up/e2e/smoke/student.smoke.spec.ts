import {
  apiRequest,
  authFile,
  bearerFor,
  expect,
  SMOKE,
  SmokeDataCleanup,
  apiBaseUrl,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "./fixtures";
import { sweepPaths } from "./route-sweep";

const STUDENT_PATHS = [
  "/me",
  "/me/book",
  "/me/bookings",
  "/me/attendance",
  "/me/check-in",
  "/me/subscriptions",
  "/me/invoices",
  "/me/calendar",
  "/me/feed",
  "/me/contests",
  "/me/messages",
  `/me/messages/${SMOKE.conversationId}`,
  "/me/trainers",
  "/me/locations",
  `/me/locations/${SMOKE.branchMainId}`,
  `/me/locations/${SMOKE.branchMainId}/classes`,
  `/me/batches/${SMOKE.trialBatchId}`,
  "/me/profile",
  "/me/profile/edit",
  "/me/profile/security",
  "/me/profile/change-email",
  "/me/profile/change-password",
  "/me/profile/follow-requests",
];

async function clearOpenBookings(
  studentId: string,
  options?: { batchId?: string; asRole?: "STUDENT" | "ONBOARDING" },
) {
  const asRole = options?.asRole ?? "STUDENT";
  const existing = await apiRequest<
    Array<{ id: string; status: string; batchId: string | null }>
  >(asRole, `/bookings/student/${studentId}`);

  for (const booking of existing) {
    if (options?.batchId !== undefined && booking.batchId !== options.batchId) {
      continue;
    }
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest(asRole, `/bookings/${booking.id}/abandon-payment`, {
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

async function createBookableBatch() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    const start = new Date(Date.UTC(2028, 5, 4 + attempt * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);
    const hour = String(8 + ((stamp + attempt) % 8)).padStart(2, "0");
    try {
      return await apiRequest<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SMOKE.studioId,
          name: `Smoke Book ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80",
          category: "ADULTS",
          branchId: SMOKE.branchMainId,
          trainerIds: [SMOKE.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "Smoke bookable class" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [start.getUTCDay()],
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            startTime: `${hour}:00`,
            endTime: `${hour}:45`,
            utcOffsetMinutes: 0,
          },
          capacity: 12,
          enrollmentMode: "STAFF_ONLY",
          subscriptionIds: [...SMOKE.adultPlanIds],
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

test.describe("student smoke @smoke", () => {
  test("student path sweep covers member shell @smoke", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, STUDENT_PATHS);
    } finally {
      await context.close();
    }
  });

  test("student discover filters @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me/book", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: /^discover$/i }),
      ).toBeVisible();
      const kids = page.getByRole("button", { name: /^Kids$/i });
      if ((await kids.count()) > 0) {
        await kids.first().click();
      }
    } finally {
      await context.close();
    }
  });

  test("student books class and reaches checkout @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const studentId = SMOKE.users.STUDENT.id;
    const batch = await createBookableBatch();
    cleanup.trackBatch(batch.id);
    await clearOpenBookings(studentId, { batchId: batch.id });

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
      await bookCta.click();

      const submit = page.getByTestId("book-submit");
      await expect(submit).toBeVisible();
      const [response] = await Promise.all([
        waitForApiResponse(page, { method: "POST", pathIncludes: "/bookings" }),
        submit.click(),
      ]);
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as { status?: string };
      if (body.status === "AWAITING_PAYMENT") {
        await expect(page).toHaveURL(/\/me\/checkout\//);
        await expect(page.getByTestId("checkout-pay")).toBeVisible();

        const [orderResponse, confirmResponse] = await Promise.all([
          waitForApiResponse(page, {
            method: "POST",
            pathIncludes: "/create-payment-order",
          }),
          waitForApiResponse(page, {
            method: "POST",
            pathIncludes: "/confirm-payment",
          }),
          page.getByTestId("checkout-pay").click(),
        ]);
        expect(orderResponse.ok()).toBeTruthy();
        expect(confirmResponse.ok()).toBeTruthy();
      }
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("student attendance history loads @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me/attendance", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/attendance/);
      await expect(
        page
          .getByRole("heading")
          .or(page.getByText(/attendance|present|absent/i))
          .first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("student notification deep link @smoke", async ({ browser }) => {
    const sessionId = SMOKE.sessionAttendanceId;
    const studentId = SMOKE.users.STUDENT.id;

    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentId,
        status: "PRESENT",
        source: "TRAINER",
      }),
    }).catch(() => undefined);

    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentId,
        status: "ABSENT",
        source: "TRAINER",
      }),
    });

    const notifications = await apiRequest<{
      items: Array<{ id: string; type: string; meta?: { batchId?: string } }>;
    }>("STUDENT", "/notifications?limit=20");
    const missed = notifications.items.find(
      (item) => item.type === "MISSED_SESSION",
    );
    expect(missed).toBeTruthy();
    const batchId = missed!.meta?.batchId ?? SMOKE.kidsBatchId;

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await page.getByTestId("notifications-bell").click();
      const missedItem = page.locator('[data-type="MISSED_SESSION"]').first();
      await expect(missedItem).toBeVisible();
      await missedItem.click();
      await expect(page).toHaveURL(new RegExp(`/me/batches/${batchId}`));
    } finally {
      await context.close();
    }
  });

  test("student chat conversation loads @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/me/messages/${SMOKE.conversationId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(
        page
          .getByRole("textbox")
          .or(page.getByPlaceholder(/message|type/i))
          .or(page.getByRole("button", { name: /send/i }))
          .first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("student check-in page loads @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me/check-in", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/check-in/);
    } finally {
      await context.close();
    }
  });

  test("student is denied staff mutations @smoke", async () => {
    const studentId = SMOKE.users.STUDENT.id;
    const token = await bearerFor("STUDENT");

    const mark = await fetch(`${apiBaseUrl()}/attendance/mark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: SMOKE.sessionAttendanceId,
        studentId,
        status: "PRESENT",
        source: "TRAINER",
      }),
    });
    expect(mark.status).toBe(403);

    const unenroll = await fetch(
      `${apiBaseUrl()}/batches/${SMOKE.kidsBatchId}/unenroll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId }),
      },
    );
    expect(unenroll.status).toBe(403);

    const markPaid = await fetch(
      `${apiBaseUrl()}/billing/${SMOKE.invoicePendingId}/paid`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: "CASH" }),
      },
    );
    expect(markPaid.status).toBe(403);
  });

  test("onboarding student cannot self-enroll into STAFF_ONLY kids batch @smoke", async () => {
    const token = await bearerFor("ONBOARDING");
    const response = await fetch(
      `${apiBaseUrl()}/batches/${SMOKE.kidsBatchId}/enroll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: SMOKE.users.ONBOARDING.id,
          subscriptionId: SMOKE.kidPlanIds[0],
        }),
      },
    );
    expect(response.status).toBe(400);
    expect(await response.text()).toMatch(/self-enrollment/i);
  });

  test("onboarding student completes wizard @smoke", async ({ browser }) => {
    test.setTimeout(180_000);
    await clearOpenBookings(SMOKE.users.ONBOARDING.id, {
      asRole: "ONBOARDING",
    });
    const context = await browser.newContext({
      storageState: authFile("ONBOARDING"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/me", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/onboarding/);

      await expect(
        page.getByRole("heading", { name: /Show up/i }),
      ).toBeVisible();
      await page.getByLabel(/Display name/i).fill("Smoke Onboarded");
      await page.getByRole("button", { name: /^Female$/i }).click();
      await page.getByRole("button", { name: /Adults/i }).click();

      const [profilePatch] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: "/users/me",
        }),
        page.getByRole("button", { name: "Continue" }).click(),
      ]);
      expect(profilePatch.ok()).toBeTruthy();

      await expect(
        page.getByRole("heading", { name: /Where are/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Brand new/i }).click();
      const [levelPatch] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: "/users/me",
        }),
        page.getByRole("button", { name: "Continue" }).click(),
      ]);
      expect(levelPatch.ok()).toBeTruthy();

      await expect(page.getByRole("heading", { name: /Try/i })).toBeVisible();
      await page.getByRole("button", { name: /^Skip$/i }).click();

      await expect(page.getByRole("heading", { name: /Any/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Skip$/i })).toBeVisible();

      const [completeResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/users/me/onboarding/complete",
        }),
        page.getByRole("button", { name: /^Skip$/i }).click(),
      ]);
      expect(completeResponse.ok()).toBeTruthy();
      await expect(page).toHaveURL(/\/me\/book/);
    } finally {
      await context.close();
    }
  });
});
