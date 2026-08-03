import {
  apiRequest,
  expect,
  TestDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";

type CreatedStudio = {
  id: string;
  name: string;
  temporaryPassword: string | null;
  owner: { id: string; email: string; name: string };
  ownerProvisioned: boolean;
};

test.describe("owner initial login @critical", () => {
  test("new owner must change temp password before entering the app @critical", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    const ownerEmail = `e2e-owner-login-${stamp}@stepup.dev`;
    const temporaryPassword = `Su-Temp${stamp.toString(36)}xx`;

    const created = await apiRequest<CreatedStudio>(
      "SYSTEM_ADMIN",
      "/studios",
      {
        method: "POST",
        body: JSON.stringify({
          name: `E2E Owner Login ${stamp}`,
          ownerEmail,
          ownerName: "E2E First Login Owner",
          temporaryPassword,
        }),
      },
    );
    cleanup.trackStudio(created.id);
    expect(created.ownerProvisioned).toBe(true);
    expect(created.temporaryPassword).toBe(temporaryPassword);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("/login");
      await waitForAppReady(page);
      await page.getByLabel("Email or username").fill(ownerEmail);
      await page
        .getByLabel("Password", { exact: true })
        .fill(temporaryPassword);

      await Promise.all([
        page.waitForURL(/\/app\/profile\/change-password\/?$/),
        page.getByRole("main").getByRole("button", { name: "Sign in" }).click(),
      ]);
      await waitForAppReady(page);

      await expect(
        page.getByRole("heading", { name: "Set a new password", exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/temporary password/i).first()).toBeVisible();

      await page.goto("/app");
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/app\/profile\/change-password\/?$/);

      await page
        .getByRole("textbox", { name: "New password *", exact: true })
        .fill("OwnerReady1!");
      await page
        .getByRole("textbox", { name: "Confirm new password *" })
        .fill("OwnerReady1!");

      const [passwordChanged] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/auth/password-changed",
        }),
        page.getByRole("button", { name: "Save and continue" }).click(),
      ]);
      expect(passwordChanged.ok()).toBeTruthy();

      await expect
        .poll(async () => page.url(), { timeout: 15_000 })
        .toMatch(/\/app\/?$/);
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/app\/?$/);
      await expect(
        page.getByRole("heading", { name: "Set a new password", exact: true }),
      ).toHaveCount(0);
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });
});
