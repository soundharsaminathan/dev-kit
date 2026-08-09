import {
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("student subscriptions @critical", () => {
  test("student subscriptions page shows membership lifecycle @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/subscriptions");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/subscriptions/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/subscription|membership|plan/i))
        .first(),
    ).toBeVisible();

    await expect(
      page.getByText(/ACTIVE|DUE|EXPIRED|Individual|Family|₹/i).first(),
    ).toBeVisible();

    await context.close();
  });

  test("student requests renewal invoice for due membership @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/subscriptions", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    const renewButton = page.getByTestId(
      `renew-membership-${SEED.membershipStudentDueId}`,
    );
    await expect(renewButton).toBeVisible();
    await renewButton.click();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: "/memberships/self/renew",
      }),
      page.getByTestId("confirm-renew-subscription").click(),
    ]);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      id: string;
      status: string;
      membershipId: string;
    };
    expect(["PENDING", "OVERDUE"]).toContain(body.status);
    expect(body.membershipId).toBe(SEED.membershipStudentDueId);

    await expect(page).toHaveURL(/\/me\/invoices/);
    await expect(
      page.getByText(/PENDING|OVERDUE|Pay at front desk|₹3,?500/i).first(),
    ).toBeVisible();

    await context.close();
  });
});
