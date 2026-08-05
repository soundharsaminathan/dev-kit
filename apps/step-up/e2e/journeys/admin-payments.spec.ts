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

async function ensureStudentFamilyMember() {
  const existing = await apiRequest<Array<{ id: string }>>(
    "STUDENT",
    "/users/me/family-members",
  );
  if (existing.length > 0) return;
  await apiRequest("STUDENT", "/users/me/family-members", {
    method: "POST",
    body: JSON.stringify({
      name: "E2E Family Kid",
      kind: "KID",
      gender: "FEMALE",
      ageRange: "UNDER_10",
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

    await page.getByRole("tab", { name: /^family$/i }).click();
    await page.getByTestId("sell-family-pack").click();
    await expect(
      page.getByRole("heading", { name: /family pack · seats/i }),
    ).toBeVisible();
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

    await context.close();
  });

  test("staff opens family pay flow from a family group card @critical", async ({
    browser,
  }) => {
    await ensureStudentFamilyMember();

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page.getByRole("tab", { name: /^family$/i }).click();
    await page.getByTestId(`family-group-${SEED.users.STUDENT.id}`).click();
    await expect(
      page.getByRole("heading", { name: /family payment · classes/i }),
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
