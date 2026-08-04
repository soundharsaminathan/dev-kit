import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

async function createPendingInvoice() {
  return apiRequest<{ id: string; status: string }>("STAFF", "/billing", {
    method: "POST",
    body: JSON.stringify({
      studioId: SEED.users.STAFF.studioId,
      studentId: SEED.users.STUDENT.id,
      amount: 1500,
    }),
  });
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
    await expect(page.getByTestId("sell-family-pack")).toBeVisible();

    await page.getByTestId(`mark-paid-${invoice.id}`).click();
    await page.getByRole("button", { name: /^Cash$/i }).click();

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
        const latest = await apiRequest<Array<{ id: string; status: string }>>(
          "STAFF",
          `/billing/studio/${SEED.users.STAFF.studioId}`,
        );
        return latest.find((row) => row.id === invoice.id)?.status;
      })
      .toBe("PAID");

    await context.close();
  });

  test("staff can open sell family pack wizard @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page.getByTestId("sell-family-pack").click();
    await expect(
      page.getByRole("heading", { name: /family pack · seats/i }),
    ).toBeVisible();
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

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
