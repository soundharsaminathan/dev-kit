import {
  apiRequest,
  authFile,
  expect,
  test,
  unwrapPage,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

async function createPendingInvoice() {
  const student = await apiRequest<{ id: string }>("OWNER", "/users", {
    method: "POST",
    body: JSON.stringify({
      name: `Pay Student ${Date.now()}`,
      email: `pay-student-${Date.now()}@stepup.dev`,
      gender: "FEMALE",
      ageRange: "TWENTY_TO_FORTY",
      styles: ["Hip Hop"],
    }),
  });
  const enrollment = await apiRequest<{
    invoice: { id: string; status: string };
  }>("STAFF", `/batches/${SEED.beginnerBatchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId: student.id,
      subscriptionId: SEED.adultPlanIds[0],
    }),
  });
  return enrollment.invoice;
}

async function createFamilyKid(name: string) {
  return apiRequest<{ id: string }>("STUDENT", "/users/me/family-members", {
    method: "POST",
    body: JSON.stringify({
      name,
      kind: "KID",
      gender: "FEMALE",
      ageRange: "UNDER_10",
    }),
  });
}

async function enrollKidPending(studentId: string) {
  const enrollment = await apiRequest<{
    invoice: { id: string; status: string };
  }>("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId,
      subscriptionId: SEED.kidPlanIds[0],
    }),
  });
  return enrollment.invoice;
}

test.describe("admin payments @critical", () => {
  test("staff marks invoice paid through UI @critical", async ({ browser }) => {
    const invoice = await createPendingInvoice();
    expect(invoice.status).toBe("PENDING");

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /^invoices$/i }),
    ).toBeVisible();

    await page.getByTestId(`mark-paid-${invoice.id}`).click();
    await page.getByRole("checkbox", { name: /^Cash$/i }).click();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/billing/${invoice.id}/paid`,
      }),
      page.getByTestId("confirm-mark-paid").click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const latest = unwrapPage(
          await apiRequest<
            | Array<{ id: string; status: string }>
            | { items: Array<{ id: string; status: string }> }
          >("STAFF", `/billing/studio/${SEED.users.STAFF.studioId}?limit=50`),
        );
        return latest.find((row) => row.id === invoice.id)?.status;
      })
      .toBe("PAID");

    await context.close();
  });

  test("staff issues partial refund through UI @critical", async ({
    browser,
  }) => {
    const invoice = await createPendingInvoice();
    await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page.getByTestId(`refund-invoice-${invoice.id}`).click();
    await page.getByRole("menuitem", { name: "Refund" }).click();
    await expect(page.getByTestId("refund-amount-input")).toHaveValue("");
    await page.getByTestId("refund-amount-input").fill("250");
    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/billing/${invoice.id}/refund`,
      }),
      page.getByTestId("confirm-refund-invoice").click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const latest = unwrapPage(
          await apiRequest<
            | Array<{ id: string; status: string; refundedAmount?: number }>
            | {
                items: Array<{
                  id: string;
                  status: string;
                  refundedAmount?: number;
                }>;
              }
          >("STAFF", `/billing/studio/${SEED.users.STAFF.studioId}?limit=50`),
        );
        return latest.find((row) => row.id === invoice.id)?.refundedAmount;
      })
      .toBe(250);

    await page.getByRole("tab", { name: /^refunds$/i }).click();
    await expect(
      page
        .getByRole("tabpanel", { name: /^refunds$/i })
        .getByTestId(`print-invoice-${invoice.id}`),
    ).toBeVisible();

    await context.close();
  });

  test("staff combines family invoices then marks paid @critical", async ({
    browser,
  }) => {
    const stamp = Date.now();
    const kidA = await createFamilyKid(`Combine A ${stamp}`);
    const kidB = await createFamilyKid(`Combine B ${stamp}`);
    const invoiceA = await enrollKidPending(kidA.id);
    const invoiceB = await enrollKidPending(kidB.id);
    expect(invoiceA.status).toBe("PENDING");
    expect(invoiceB.status).toBe("PENDING");

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page.getByRole("tab", { name: /^family$/i }).click();
    await expect(page.getByTestId("sell-family-pack")).toHaveCount(0);
    await page.getByTestId(`family-group-${SEED.users.STUDENT.id}`).click();
    await expect(
      page.getByRole("heading", { name: /combine ·/i }),
    ).toBeVisible();

    await page
      .getByTestId(`combine-invoice-${invoiceA.id}`)
      .getByRole("checkbox")
      .click();
    await expect(page.getByTestId("confirm-family-combine")).toBeDisabled();
    await page
      .getByTestId(`combine-invoice-${invoiceB.id}`)
      .getByRole("checkbox")
      .click();
    await page.getByTestId("family-combine-discount").fill("100");

    const [combineResponse] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: "/billing/family-combine",
      }),
      page.getByTestId("confirm-family-combine").click(),
    ]);
    expect(combineResponse.ok()).toBeTruthy();
    const combined = (await combineResponse.json()) as { id: string };

    await page.getByRole("checkbox", { name: /^Cash$/i }).click();
    const [paidResponse] = await Promise.all([
      waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/billing/${combined.id}/paid`,
      }),
      page.getByTestId("confirm-open-family-paid").click(),
    ]);
    expect(paidResponse.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const latest = unwrapPage(
          await apiRequest<
            | Array<{ id: string; status: string }>
            | { items: Array<{ id: string; status: string }> }
          >("STAFF", `/billing/studio/${SEED.users.STAFF.studioId}?limit=50`),
        );
        return latest.find((row) => row.id === combined.id)?.status;
      })
      .toBe("PAID");

    await context.close();
  });

  test("staff payments page loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/payments", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/payments/);
    await expect(
      page.getByRole("heading", { name: /^payments$/i }),
    ).toBeVisible();
    await expect(page.getByText(/net earnings/i).first()).toBeVisible();
    await context.close();
  });
});
