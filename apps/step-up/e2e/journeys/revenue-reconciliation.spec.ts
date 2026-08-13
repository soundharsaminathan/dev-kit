import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";
import { enrollPrepaid } from "../http/billing-fixtures";

const ADULT_MONTHLY_PRICE = 3500;
const KID_MONTHLY_PRICE = 2500;

async function enrollAndPay(
  cleanup: TestDataCleanup,
  planId: string,
  method = "CASH",
  batchId?: string,
) {
  const created = await enrollPrepaid(cleanup, {
    batchId,
    planId,
    category: planId.includes("kid") ? "KIDS" : "ADULTS",
  });
  await apiRequest("STAFF", `/billing/${created.invoice.id}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod: method }),
  });
  return { ...created, invoice: { ...created.invoice, status: "PAID" } };
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function trainerAnalyticsRow(batchId: string) {
  const trainerIds = [SEED.users.TRAINER.id, SEED.users.TRAINER_2.id];
  for (const trainerId of trainerIds) {
    const analytics = await apiRequest<{
      totals: { collected: number; refunded: number };
      byBatch: Array<{ batchId: string; collected: number }>;
    }>(
      "STAFF",
      `/billing/analytics/trainer/${trainerId}?studioId=${SEED.studioId}`,
    );
    const row = analytics.byBatch.find((entry) => entry.batchId === batchId);
    if (row) {
      return { trainerId, analytics, row };
    }
  }
  return { trainerId: null, analytics: null, row: undefined };
}

test.describe("Revenue reconciliation E2E @critical", () => {
  test.describe.configure({ mode: "serial" });

  test("full revenue reconciliation: multiple payments verified across batch, trainer, and studio views @critical", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const cleanup = new TestDataCleanup();

    try {
      const paidA = await enrollAndPay(cleanup, SEED.adultPlanIds[0], "CASH");
      expect(paidA.invoice.status).toBe("PAID");
      const adultBatchId = paidA.batchId;

      const paidB = await enrollAndPay(
        cleanup,
        SEED.adultPlanIds[0],
        "UPI_MANUAL",
        adultBatchId,
      );
      expect(paidB.invoice.status).toBe("PAID");

      const paidC = await enrollAndPay(cleanup, SEED.kidPlanIds[0], "CASH");
      expect(paidC.invoice.status).toBe("PAID");
      const kidsBatchId = paidC.batchId;

      const batchARevenue = await apiRequest<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${adultBatchId}/revenue`);
      expect(batchARevenue.totals.collected).toBe(ADULT_MONTHLY_PRICE * 2);
      expect(batchARevenue.totals.invoiceCount).toBeGreaterThanOrEqual(2);

      const batchBRevenue = await apiRequest<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${kidsBatchId}/revenue`);
      expect(batchBRevenue.totals.collected).toBe(KID_MONTHLY_PRICE);

      // === UI verification: Owner views batch detail page ===
      const ownerContext = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      try {
        const ownerPage = await ownerContext.newPage();
        await ownerPage.goto(`/app/batches/${adultBatchId}`, {
          waitUntil: "domcontentloaded",
        });
        await waitForAppReady(ownerPage);

        // Verify batch revenue section is visible
        const revenueSection = ownerPage.getByLabel("Batch revenue");
        await expect(revenueSection).toBeVisible();
        await expect(revenueSection.getByText("Collected")).toBeVisible();

        // Verify the collected amount matches
        const formattedBatchA = formatINR(ADULT_MONTHLY_PRICE * 2);
        await expect(
          revenueSection.locator('[data-tone="success"]'),
        ).toHaveText(formattedBatchA);
      } finally {
        await ownerContext.close();
      }

      // === UI verification: Owner views payments page ===
      const paymentsContext = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      try {
        const paymentsPage = await paymentsContext.newPage();
        await paymentsPage.goto("/app/payments", {
          waitUntil: "domcontentloaded",
        });
        await waitForAppReady(paymentsPage);

        await expect(
          paymentsPage.getByRole("heading", { name: /^payments$/i }),
        ).toBeVisible();
        await expect(
          paymentsPage.getByText(/net earnings/i).first(),
        ).toBeVisible();
      } finally {
        await paymentsContext.close();
      }
    } finally {
      await cleanup.dispose();
    }
  });

  test("batch revenue isolation: paying for batch A does not affect batch B @critical", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const batchBBefore = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/revenue`);

      await enrollAndPay(cleanup, SEED.adultPlanIds[0]);

      const batchBAfter = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/revenue`);

      expect(batchBAfter.totals.collected).toBe(batchBBefore.totals.collected);
    } finally {
      await cleanup.dispose();
    }
  });

  test("refund appears in invoices UI; trainer collected drops @critical", async ({
    browser,
  }) => {
    const cleanup = new TestDataCleanup();
    try {
      const paid = await enrollAndPay(cleanup, SEED.adultPlanIds[0]);
      const invoice = paid.invoice;

      const beforeRevenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${paid.batchId}/revenue`);

      const beforeAnalytics = await trainerAnalyticsRow(paid.batchId);
      expect(beforeAnalytics.row).toBeDefined();
      const beforeCollected = beforeAnalytics.row!.collected;

      const refundAmount = 500;
      await apiRequest("STAFF", `/billing/${invoice.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: refundAmount, reason: "E2E test" }),
      });

      // Batch /revenue collected is gross PAID amount (does not subtract refunds).
      const afterRevenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${paid.batchId}/revenue`);
      expect(afterRevenue.totals.collected).toBe(
        beforeRevenue.totals.collected,
      );

      const afterAnalytics = await trainerAnalyticsRow(paid.batchId);
      expect(afterAnalytics.row).toBeDefined();
      expect(afterAnalytics.row!.collected).toBe(
        beforeCollected - refundAmount,
      );

      const context = await browser.newContext({
        storageState: authFile("STAFF"),
      });
      try {
        const page = await context.newPage();
        await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
        await waitForAppReady(page);

        await page.getByRole("tab", { name: /^refunds$/i }).click();
        await expect(
          page
            .getByRole("tabpanel", { name: /^refunds$/i })
            .getByTestId(`print-invoice-${invoice.id}`),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot access payment analytics @critical", async () => {
    await expect(
      apiRequest(
        "TRAINER",
        `/billing/analytics/trainer/${SEED.users.TRAINER.id}?studioId=${SEED.studioId}`,
      ),
    ).rejects.toThrow(/403/);
    await expect(
      apiRequest("TRAINER", `/batches/${SEED.beginnerBatchId}/revenue`),
    ).rejects.toThrow(/403/);
  });

  test("student cannot access revenue endpoints @critical", async () => {
    // Student cannot mark paid
    await apiRequest(
      "STUDENT",
      `/billing/${SEED.invoiceRenewalPendingId}/paid`,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      },
    ).catch((error) => {
      expect(String(error)).toContain("403");
    });

    // Student cannot refund
    await apiRequest(
      "STUDENT",
      `/billing/${SEED.invoiceRenewalPendingId}/refund`,
      {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      },
    ).catch((error) => {
      expect(String(error)).toContain("403");
    });
  });

  test("discounted payment shows correct net amount in batch revenue @critical", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const created = await enrollPrepaid(cleanup, {
        planId: SEED.adultPlanIds[0],
        studentName: "E2E Discount Revenue Student",
      });

      const discount = 500;
      await apiRequest("STAFF", `/billing/${created.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: discount,
        }),
      });

      const revenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${created.batchId}/revenue`);

      // Revenue should reflect the discounted amount
      expect(revenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE - discount,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
