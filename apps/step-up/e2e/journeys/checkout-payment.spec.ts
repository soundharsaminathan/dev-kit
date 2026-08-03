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

const CONFIRM_BATCH_ID = SEED.trialBatchId;
const ABANDON_BATCH_ID = "batch-beginner-1";

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
      }).catch(() => null);
    } else if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      await apiRequest("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      }).catch(() => null);
    }
  }
}

async function clearPendingCheckoutInvoices(studentId: string) {
  const invoices = await apiRequest<
    Array<{
      id: string;
      status: string;
      purchaseMeta?: unknown;
      paymentHoldExpiresAt?: string | null;
    }>
  >("STUDENT", `/billing/student/${studentId}`);

  for (const invoice of invoices) {
    if (invoice.status !== "PENDING" || !invoice.purchaseMeta) continue;
    await apiRequest("STUDENT", `/billing/${invoice.id}/abandon-payment`, {
      method: "POST",
    }).catch(() => null);
  }
}

async function createAwaitingPaymentBooking(batchId: string) {
  const studentId = SEED.users.STUDENT.id;
  await clearOpenBookings(studentId, batchId);
  const created = await apiRequest<{ id: string; status: string }>(
    "STUDENT",
    "/bookings",
    {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STUDENT.studioId,
        studentId,
        type: "TRIAL",
        batchId,
      }),
    },
  );
  return created;
}

async function createPlanBatch() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    const start = new Date(Date.UTC(2028, 6, 4 + attempt * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);
    const hour = String(10 + ((stamp + attempt) % 6)).padStart(2, "0");
    const minute = String((stamp + attempt * 17) % 60).padStart(2, "0");
    const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
    const endHour = String(
      Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
    ).padStart(2, "0");

    try {
      return await apiRequest<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `E2E Plan Pay ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80",
          category: "ADULTS",
          branchId: "branch-main-1",
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "E2E plan checkout class" },
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
    : new Error("Could not create plan batch");
}

test.describe("checkout payment @critical", () => {
  test.describe.configure({ mode: "serial" });

  test("student confirms payment through UI @critical", async ({ browser }) => {
    const created = await createAwaitingPaymentBooking(CONFIRM_BATCH_ID);
    test.skip(
      created.status !== "AWAITING_PAYMENT",
      `Expected AWAITING_PAYMENT, got ${created.status}`,
    );

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto(`/me/checkout/${created.id}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const pay = page.getByTestId("checkout-pay");
    await expect(pay).toBeVisible();

    const [orderResponse, confirmResponse] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/bookings/${created.id}/create-payment-order`,
      }),
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/bookings/${created.id}/confirm-payment`,
      }),
      pay.click(),
    ]);
    expect(orderResponse.ok()).toBeTruthy();
    expect(confirmResponse.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const booking = await apiRequest<{ status: string }>(
          "STUDENT",
          `/bookings/${created.id}`,
        );
        return booking.status;
      })
      .toBe("PENDING");

    await context.close();
  });

  test("student abandons payment through UI @critical", async ({ browser }) => {
    const created = await createAwaitingPaymentBooking(ABANDON_BATCH_ID);
    test.skip(
      created.status !== "AWAITING_PAYMENT",
      `Expected AWAITING_PAYMENT, got ${created.status}`,
    );

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto(`/me/checkout/${created.id}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const abandon = page.getByTestId("checkout-abandon");
    await expect(abandon).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/bookings/${created.id}/abandon-payment`,
      }),
      abandon.click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const booking = await apiRequest<{ status: string }>(
          "STUDENT",
          `/bookings/${created.id}`,
        );
        return booking.status;
      })
      .toBe("CANCELLED");

    await context.close();
  });

  test("student pays for a plan through UI @critical", async ({ browser }) => {
    const studentId = SEED.users.STUDENT.id;
    const cleanup = new TestDataCleanup();
    await clearPendingCheckoutInvoices(studentId);
    const batch = await createPlanBatch();
    cleanup.trackBatch(batch.id);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/me/batches/${batch.id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const planCard = page.getByTestId("plan-card").first();
      await expect(planCard).toBeVisible();
      await planCard.click();

      const submit = page.getByTestId("purchase-submit");
      await expect(submit).toBeVisible();

      const [purchaseResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/batches/${batch.id}/purchase`,
        }),
        submit.click(),
      ]);
      expect(purchaseResponse.ok()).toBeTruthy();
      const invoice = (await purchaseResponse.json()) as {
        id: string;
        status: string;
      };
      expect(invoice.status).toBe("PENDING");

      await expect(page).toHaveURL(
        new RegExp(`/me/checkout/invoice/${invoice.id}`),
      );
      const pay = page.getByTestId("checkout-pay");
      await expect(pay).toBeVisible();

      const [orderResponse, confirmResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/billing/${invoice.id}/create-payment-order`,
        }),
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/billing/${invoice.id}/confirm-payment`,
        }),
        pay.click(),
      ]);
      expect(orderResponse.ok()).toBeTruthy();
      expect(confirmResponse.ok()).toBeTruthy();

      await expect
        .poll(async () => {
          const paid = await apiRequest<{ status: string }>(
            "STUDENT",
            `/billing/${invoice.id}`,
          );
          return paid.status;
        })
        .toBe("PAID");
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });
});
