import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("admin payments @critical", () => {
  test("staff marks invoice paid through UI @critical", async ({ browser }) => {
    const invoiceId = SEED.unpaidInvoiceId;

    const invoices = await apiRequest<Array<{ id: string; status: string }>>(
      "STAFF",
      `/billing/studio/${SEED.users.STAFF.studioId}`,
    );
    const target =
      invoices.find((invoice) => invoice.id === invoiceId) ??
      invoices.find((invoice) => invoice.status !== "PAID");

    test.skip(!target, "No unpaid invoice available in this environment");
    test.skip(
      target!.status === "PAID",
      "Seed unpaid invoice already paid — re-seed to reset",
    );

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /^invoices$/i }),
    ).toBeVisible();

    await page.getByTestId(`mark-paid-${target!.id}`).click();
    await page.getByRole("button", { name: /^Cash$/i }).click();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/billing/${target!.id}/paid`,
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
        return latest.find((invoice) => invoice.id === target!.id)?.status;
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
    await context.close();
  });
});
