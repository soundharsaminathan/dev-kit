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
import { createCalendarBatch, enrollPrepaid } from "../http/billing-fixtures";
import { TestDataCleanup } from "../http/helpers";

test.describe("admin payments @critical", () => {
  test("staff marks invoice paid through UI @critical", async ({ browser }) => {
    const cleanup = new TestDataCleanup();
    const { invoice } = await enrollPrepaid(cleanup);
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
    await cleanup.dispose();
  });

  test("staff issues partial refund through UI @critical", async ({
    browser,
  }) => {
    const cleanup = new TestDataCleanup();
    const { invoice } = await enrollPrepaid(cleanup);
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
    await cleanup.dispose();
  });

  test("staff combines family invoices then marks paid @critical", async ({
    browser,
  }) => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    const kidA = await apiRequest<{ id: string }>(
      "STUDENT",
      "/users/me/family-members",
      {
        method: "POST",
        body: JSON.stringify({
          name: `Combine A ${stamp}`,
          kind: "KID",
          gender: "FEMALE",
          ageRange: "UNDER_10",
        }),
      },
    );
    cleanup.trackStudent(kidA.id);
    const kidB = await apiRequest<{ id: string }>(
      "STUDENT",
      "/users/me/family-members",
      {
        method: "POST",
        body: JSON.stringify({
          name: `Combine B ${stamp}`,
          kind: "KID",
          gender: "FEMALE",
          ageRange: "UNDER_10",
        }),
      },
    );
    cleanup.trackStudent(kidB.id);
    const kidsBatch = await createCalendarBatch(cleanup, {
      kind: "prepaid",
      category: "KIDS",
      capacity: 8,
    });
    const invoiceA = (
      await enrollPrepaid(cleanup, {
        category: "KIDS",
        studentId: kidA.id,
        batchId: kidsBatch.id,
        planId: SEED.kidPlanIds[0],
      })
    ).invoice;
    const invoiceB = (
      await enrollPrepaid(cleanup, {
        category: "KIDS",
        studentId: kidB.id,
        batchId: kidsBatch.id,
        planId: SEED.kidPlanIds[0],
      })
    ).invoice;
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
    await cleanup.dispose();
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
    await expect(page.getByTestId("payments-branch-switcher")).toBeVisible();
    await context.close();
  });
});
