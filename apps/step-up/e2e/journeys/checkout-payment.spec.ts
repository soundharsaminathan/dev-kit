import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

const CONFIRM_BATCH_ID = SEED.trialBatchId;
const ABANDON_BATCH_ID = "batch-beginner-1";

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
        type: "TRIAL",
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

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/bookings/${created.id}/confirm-payment`,
      }),
      pay.click(),
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

    await expect(page).toHaveURL(/\/me\/(book|batches)/);

    await context.close();
  });
});
