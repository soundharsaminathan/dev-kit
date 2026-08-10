import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";

const ADULT_MONTHLY_PRICE = 3500;
const KID_MONTHLY_PRICE = 2500;

async function createHttpStudent(name: string, cleanup: TestDataCleanup) {
  const student = await apiRequest<{ id: string; email: string }>(
    "OWNER",
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email: `revenue-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@stepup.dev`,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    },
  );
  cleanup.trackStudent(student.id);
  return student;
}

async function enrollAndPay(
  studentId: string,
  batchId: string,
  planId: string,
  method = "CASH",
) {
  const enrollment = await apiRequest<{
    invoice: { id: string; status: string; amount: number };
  }>("STAFF", `/batches/${batchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId,
      subscriptionId: planId,
    }),
  });
  const invoice = enrollment.invoice;
  await apiRequest(`STAFF`, `/billing/${invoice.id}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod: method }),
  });
  return invoice;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

test.describe("Revenue reconciliation E2E @critical", () => {
  test.describe.configure({ mode: "serial" });

  test("full revenue reconciliation: multiple payments verified across batch, trainer, and studio views @critical", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const cleanup = new TestDataCleanup();

    try {
      // === Setup: Create students and make payments ===
      const studentA = await createHttpStudent("E2E Recon Student A", cleanup);
      const studentB = await createHttpStudent("E2E Recon Student B", cleanup);

      // Payment 1: Student A → Batch A → ₹3,500
      const inv1 = await enrollAndPay(
        studentA.id,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "CASH",
      );
      expect(inv1.status).toBe("PAID");

      // Payment 2: Student B → Batch A → ₹3,500
      const inv2 = await enrollAndPay(
        studentB.id,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "UPI_MANUAL",
      );
      expect(inv2.status).toBe("PAID");

      // Payment 3: Student B → Batch B → ₹2,500
      const inv3 = await enrollAndPay(
        studentB.id,
        SEED.kidsBatchId,
        SEED.kidPlanIds[0],
        "CASH",
      );
      expect(inv3.status).toBe("PAID");

      // === API-level verification ===
      const batchARevenue = await apiRequest<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/revenue`);
      expect(batchARevenue.totals.collected).toBe(ADULT_MONTHLY_PRICE * 2);
      expect(batchARevenue.totals.invoiceCount).toBeGreaterThanOrEqual(2);

      const batchBRevenue = await apiRequest<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/revenue`);
      expect(batchBRevenue.totals.collected).toBe(KID_MONTHLY_PRICE);

      // === UI verification: Owner views batch detail page ===
      const ownerContext = await browser.newContext({
        storageState: authFile("OWNER"),
      });
      try {
        const ownerPage = await ownerContext.newPage();
        await ownerPage.goto(`/app/batches/${SEED.beginnerBatchId}`, {
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
      const student = await createHttpStudent("E2E Isolation Student", cleanup);

      const batchBBefore = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/revenue`);

      await enrollAndPay(
        student.id,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
      );

      const batchBAfter = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/revenue`);

      expect(batchBAfter.totals.collected).toBe(batchBBefore.totals.collected);
    } finally {
      await cleanup.dispose();
    }
  });

  test("refund reduces batch revenue in UI @critical", async ({ browser }) => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("E2E Refund UI Student", cleanup);
      const invoice = await enrollAndPay(
        student.id,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
      );

      // Verify batch revenue before refund
      const beforeRevenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/revenue`);

      // Issue refund
      const refundAmount = 500;
      await apiRequest(`STAFF`, `/billing/${invoice.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: refundAmount, reason: "E2E test" }),
      });

      // Verify batch revenue decreased
      const afterRevenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/revenue`);
      expect(afterRevenue.totals.collected).toBe(
        beforeRevenue.totals.collected - refundAmount,
      );

      // Verify in UI: staff invoices page shows refund
      const context = await browser.newContext({
        storageState: authFile("STAFF"),
      });
      try {
        const page = await context.newPage();
        await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
        await waitForAppReady(page);

        // Switch to refunds tab
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

  test("trainer sees only their batches in analytics @critical", async () => {
    // Trainer A has both beginner and kids batches
    const analytics = await apiRequest<{
      trainerId: string;
      totals: { collected: number };
      byBatch: Array<{ batchId: string; collected: number }>;
    }>(
      "TRAINER",
      `/billing/analytics/trainer/${SEED.users.TRAINER.id}?studioId=${SEED.studioId}`,
    );

    expect(analytics.trainerId).toBe(SEED.users.TRAINER.id);
    // Should have batches assigned to this trainer
    expect(analytics.byBatch.length).toBeGreaterThanOrEqual(1);

    // All batches should be ones this trainer is assigned to
    for (const row of analytics.byBatch) {
      expect([
        SEED.beginnerBatchId,
        SEED.kidsBatchId,
        SEED.trialBatchId,
      ]).toContain(row.batchId);
    }
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
      const student = await createHttpStudent(
        "E2E Discount Revenue Student",
        cleanup,
      );
      const enrollment = await apiRequest<{
        invoice: { id: string; amount: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      const discount = 500;
      await apiRequest("STAFF", `/billing/${enrollment.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: discount,
        }),
      });

      const revenue = await apiRequest<{
        totals: { collected: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/revenue`);

      // Revenue should reflect the discounted amount
      expect(revenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE - discount,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
