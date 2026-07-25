import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

/** STAFF_ONLY batch so the UI exposes Book → Submit request (not Join/enroll). */
const BOOK_BATCH_ID = "batch-adults-1";
const TRIAL_BATCH_ID = SEED.trialBatchId;

async function clearOpenBookings(studentId: string, batchId: string) {
  const existing = await apiRequest<
    Array<{ id: string; status: string; batchId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`);

  for (const booking of existing) {
    if (booking.batchId !== batchId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await apiRequest("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
      });
    } else if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      await apiRequest("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    }
  }
}

test.describe("discover and book @critical", () => {
  test("student books class through UI @critical", async ({ browser }) => {
    const studentId = SEED.users.STUDENT.id;
    await clearOpenBookings(studentId, BOOK_BATCH_ID);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto(`/me/batches/${BOOK_BATCH_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const bookCta = page.getByTestId("book-class-cta");
    await expect(bookCta).toBeVisible();
    await expect(bookCta).toHaveText(/book this class/i);
    await bookCta.click();

    const submit = page.getByTestId("book-submit");
    await expect(submit).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, { method: "POST", pathIncludes: "/bookings" }),
      submit.click(),
    ]);
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { status?: string; id?: string };
    if (body.status === "AWAITING_PAYMENT") {
      await expect(page).toHaveURL(/\/me\/checkout\//);
      await expect(page.getByTestId("checkout-pay")).toBeVisible();
    } else {
      await expect(
        page.getByText(/request|booked|pending|success/i).first(),
      ).toBeVisible();
    }

    await context.close();
  });

  test("student can join self-enroll trial class through UI @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto(`/me/batches/${TRIAL_BATCH_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const joinCta = page.getByTestId("book-class-cta");
    // Already enrolled → CTA may be hidden; assert enrolled state instead.
    if ((await joinCta.count()) === 0) {
      await expect(
        page.getByText(/enrolled|you're in|joined|member/i).first(),
      ).toBeVisible();
      await context.close();
      return;
    }

    await expect(joinCta).toHaveText(/join this class/i);
    await joinCta.click();

    const submit = page.getByTestId("enroll-submit");
    await expect(submit).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/batches/${TRIAL_BATCH_ID}/enroll`,
      }),
      submit.click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(page.getByText(/enrolled|joined/i).first()).toBeVisible();

    await context.close();
  });

  test("student can browse book page and filter UI", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/book", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/book/);
    await expect(
      page.getByRole("heading", { name: /^discover$/i }),
    ).toBeVisible();

    const kids = page.getByRole("button", { name: /^Kids$/i });
    if ((await kids.count()) > 0) {
      await kids.first().click();
    }

    await context.close();
  });
});
