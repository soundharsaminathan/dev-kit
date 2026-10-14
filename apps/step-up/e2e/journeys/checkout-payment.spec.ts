import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import {
  createOnboardedStudent,
  impersonateStudent,
} from "../fixtures/onboarded-student";
import { SEED } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";
import { createCalendarBatch } from "../http/billing-fixtures";

const CONFIRM_BATCH_ID = SEED.kidsBatchId;
const ABANDON_BATCH_ID = SEED.kidsBatchId;

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
        type: "OPEN_SEAT",
        batchId,
      }),
    },
  );
  return created;
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

  test("student pays for a plan inside batch and batch revenue updates @critical", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const cleanup = new TestDataCleanup();
    // Seed STUDENT already has a current-month track, so purchase is a switch
    // (no checkout invoice). A new joiner on an owned prepaid batch holds.
    const student = await createOnboardedStudent("plan-pay", cleanup);
    const batch = await createCalendarBatch(cleanup, {
      kind: "prepaid",
      category: "ADULTS",
      name: `E2E Plan Pay ${Date.now()}`,
    });

    const studentContext = await browser.newContext();
    try {
      const studentPage = await studentContext.newPage();
      await impersonateStudent(studentPage, student);
      await studentPage.goto(`/me/batches/${batch.id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(studentPage);

      const planCard = studentPage.getByTestId("plan-card").first();
      await expect(planCard).toBeVisible();
      await planCard.click();

      const submit = studentPage.getByTestId("purchase-submit");
      await expect(submit).toBeVisible();

      const [purchaseResponse] = await Promise.all([
        waitForApiResponse(studentPage, {
          method: "POST",
          pathIncludes: `/batches/${batch.id}/purchase`,
        }),
        submit.click(),
      ]);
      expect(purchaseResponse.ok()).toBeTruthy();
      const body = (await purchaseResponse.json()) as {
        id?: string;
        status?: string;
        amount?: number;
        billingKind?: string;
        invoice?: { id: string; status: string; amount?: number } | null;
      };
      const invoice = body.invoice?.id ? body.invoice : body.id ? body : null;
      expect(
        invoice?.status,
        `expected prepaid checkout invoice, got ${JSON.stringify(body)}`,
      ).toBe("PENDING");
      expect(Number(invoice?.amount)).toBeGreaterThan(0);
      const invoiceId = invoice!.id;

      await expect(studentPage).toHaveURL(
        new RegExp(`/me/checkout/invoice/${invoiceId}`),
      );
      const pay = studentPage.getByTestId("checkout-pay");
      await expect(pay).toBeVisible();

      const [orderResponse, confirmResponse] = await Promise.all([
        waitForApiResponse(studentPage, {
          method: "POST",
          pathIncludes: `/billing/${invoiceId}/create-payment-order`,
        }),
        waitForApiResponse(studentPage, {
          method: "POST",
          pathIncludes: `/billing/${invoiceId}/confirm-payment`,
        }),
        pay.click(),
      ]);
      expect(orderResponse.ok()).toBeTruthy();
      expect(confirmResponse.ok()).toBeTruthy();

      let paidAmount = 0;
      await expect
        .poll(async () => {
          const current = await apiRequest<{ status: string; amount: number }>(
            "STAFF",
            `/billing/${invoiceId}`,
          );
          paidAmount = Number(current.amount);
          return current.status;
        })
        .toBe("PAID");

      await expect
        .poll(async () => {
          const revenue = await apiRequest<{
            totals: { collected: number; invoiceCount: number };
          }>("OWNER", `/batches/${batch.id}/revenue`);
          return revenue.totals.collected;
        })
        .toBe(paidAmount);

      await studentContext.close();

      const ownerContext = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      try {
        const ownerPage = await ownerContext.newPage();
        const [revenueResponse] = await Promise.all([
          waitForApiResponse(ownerPage, {
            method: "GET",
            pathIncludes: `/batches/${batch.id}/revenue`,
          }),
          ownerPage.goto(`/app/batches/${batch.id}`, {
            waitUntil: "domcontentloaded",
          }),
        ]);
        await waitForAppReady(ownerPage);
        expect(revenueResponse.ok()).toBeTruthy();
        const revenue = (await revenueResponse.json()) as {
          totals: { collected: number; invoiceCount: number };
        };
        expect(revenue.totals.collected).toBe(paidAmount);
        expect(revenue.totals.invoiceCount).toBeGreaterThanOrEqual(1);

        const revenueSection = ownerPage.getByLabel("Batch revenue");
        await expect(revenueSection).toBeVisible();
        await expect(revenueSection.getByText("Collected")).toBeVisible();
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(paidAmount);
        await expect(
          revenueSection.locator('[data-tone="success"]'),
        ).toHaveText(formatted);
      } finally {
        await ownerContext.close();
      }
    } finally {
      await studentContext.close().catch(() => undefined);
      await cleanup.dispose();
    }
  });
});
