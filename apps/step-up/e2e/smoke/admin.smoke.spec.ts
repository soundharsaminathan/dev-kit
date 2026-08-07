import {
  apiRequest,
  apiBaseUrl,
  authFile,
  bearerFor,
  expect,
  SMOKE,
  SmokeDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "./fixtures";
import { sweepPath, sweepPaths } from "./route-sweep";

const STAFF_PATHS = [
  "/app",
  "/app/batches",
  "/app/batches/new",
  `/app/batches/${SMOKE.kidsBatchId}`,
  "/app/students",
  "/app/students/new",
  `/app/students/${SMOKE.users.STUDENT.id}`,
  "/app/students/import",
  "/app/trainers",
  "/app/trainers/new",
  "/app/bookings",
  `/app/sessions/${SMOKE.sessionAttendanceId}/attendance`,
  "/app/calendar",
  "/app/payments",
  "/app/invoices",
  "/app/subscriptions",
  "/app/subscriptions/new",
  `/app/subscriptions/${SMOKE.adultMonthlyId}`,
  "/app/certificates",
  "/app/certificates/new",
  `/app/certificates/${SMOKE.certificateTemplateId}`,
  "/app/contests",
  "/app/contests/new",
  `/app/contests/${SMOKE.contestId}`,
  "/app/locations",
  "/app/locations/new",
  `/app/locations/${SMOKE.branchMainId}`,
  `/app/locations/${SMOKE.branchMainId}/edit`,
  `/app/locations/${SMOKE.branchMainId}/classes`,
  "/app/retention",
  "/app/feed",
  "/app/messages",
  `/app/messages/${SMOKE.conversationId}`,
  "/app/profile",
  "/app/profile/edit",
  "/app/profile/security",
  "/app/profile/change-email",
  "/app/profile/change-password",
  "/app/profile/follow-requests",
  "/app/settings",
  "/app/settings/profile",
  "/app/settings/team",
  "/app/settings/billing",
];

async function ensureStudentFamilyMember() {
  const existing = await apiRequest<Array<{ id: string }>>(
    "STUDENT",
    "/users/me/family-members",
  );
  if (existing.length > 0) return;
  await apiRequest("STUDENT", "/users/me/family-members", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Family Kid",
      kind: "KID",
      gender: "FEMALE",
      ageRange: "UNDER_10",
    }),
  });
}

test.describe("admin (staff) smoke @smoke", () => {
  test("staff path sweep covers admin shell @smoke", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, STAFF_PATHS);
    } finally {
      await context.close();
    }
  });

  test("staff is denied owner-only settings pages @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await sweepPath(page, "/app/settings/payments", {
        denyRedirect: /\/app\/settings\/?$/,
      });
      await sweepPath(page, "/app/settings/branding", {
        denyRedirect: /\/app\/settings\/?$/,
      });
      await sweepPath(page, "/app/settings/theme", {
        denyRedirect: /\/app\/settings\/?$/,
      });
    } finally {
      await context.close();
    }
  });

  test("staff cannot double-mark an invoice paid @smoke", async () => {
    const cleanup = new SmokeDataCleanup();
    try {
      const stamp = Date.now();
      const student = await apiRequest<{ id: string }>("OWNER", "/users", {
        method: "POST",
        body: JSON.stringify({
          name: `Smoke Paid Twice ${stamp}`,
          email: `smoke-paid-twice-${stamp}@stepup.dev`,
          gender: "FEMALE",
          ageRange: "TWENTY_TO_FORTY",
          styles: ["Hip Hop"],
        }),
      });
      cleanup.trackStudent(student.id);
      const enrollment = await apiRequest<{
        invoice: { id: string; status: string };
      }>("STAFF", `/batches/${SMOKE.beginnerBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SMOKE.adultPlanIds[0],
        }),
      });
      await apiRequest("STAFF", `/billing/${enrollment.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      const token = await bearerFor("STAFF");
      const response = await fetch(
        `${apiBaseUrl()}/billing/${enrollment.invoice.id}/paid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentMethod: "CASH" }),
        },
      );
      expect(response.status).toBe(400);
      expect(await response.text()).toMatch(/already paid/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff marks invoice paid @smoke", async ({ browser }) => {
    const cleanup = new SmokeDataCleanup();
    const student = await apiRequest<{ id: string }>("OWNER", "/users", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke Pay ${Date.now()}`,
        email: `smoke-pay-${Date.now()}@stepup.dev`,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    });
    cleanup.trackStudent(student.id);
    const enrollment = await apiRequest<{
      invoice: { id: string; status: string };
    }>("STAFF", `/batches/${SMOKE.beginnerBatchId}/enroll`, {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        subscriptionId: SMOKE.adultPlanIds[0],
      }),
    });
    const invoice = enrollment.invoice;

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
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
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("staff issues partial refund from invoices @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const student = await apiRequest<{ id: string }>("OWNER", "/users", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke Refund ${Date.now()}`,
        email: `smoke-refund-${Date.now()}@stepup.dev`,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    });
    cleanup.trackStudent(student.id);
    const enrollment = await apiRequest<{
      invoice: { id: string; status: string; amount: number };
    }>("STAFF", `/batches/${SMOKE.beginnerBatchId}/enroll`, {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        subscriptionId: SMOKE.adultPlanIds[0],
      }),
    });
    const invoice = enrollment.invoice;
    await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await page.getByTestId(`refund-invoice-${invoice.id}`).click();
      await page.getByTestId("refund-amount-input").fill("250");
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/billing/${invoice.id}/refund`,
        }),
        page.getByTestId("confirm-refund-invoice").click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await page.getByRole("tab", { name: /^refunds$/i }).click();
      await expect(
        page
          .getByRole("tabpanel", { name: /^refunds$/i })
          .getByTestId(`print-invoice-${invoice.id}`),
      ).toBeVisible();
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("staff creates subscription plan @smoke", async ({ browser }) => {
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const created = await apiRequest<{ id: string }>(
      "STAFF",
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SMOKE.studioId,
          name: `Smoke Plan ${stamp}`,
          kind: "INDIVIDUAL",
          individualAudience: "ADULT",
          billingCadence: "MONTHLY",
          price: 1999,
          active: true,
        }),
      },
    );
    cleanup.trackSubscription(created.id);

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/subscriptions", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page.getByText(`Smoke Plan ${stamp}`)).toBeVisible();
      await sweepPath(page, `/app/subscriptions/${created.id}`);
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("staff can open sell family pack wizard @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      await page.getByRole("tab", { name: /^family$/i }).click();
      await page.getByTestId("sell-family-pack").click();
      await expect(
        page.getByRole("heading", { name: /family pack · seats/i }),
      ).toBeVisible();
      await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("staff opens family pay flow from a family group card @smoke", async ({
    browser,
  }) => {
    await ensureStudentFamilyMember();

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      await page.getByRole("tab", { name: /^family$/i }).click();
      await page.getByTestId(`family-group-${SMOKE.users.STUDENT.id}`).click();
      await expect(
        page.getByRole("heading", { name: /family payment · classes/i }),
      ).toBeVisible();
      await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("staff student import and create pages load @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await sweepPath(page, "/app/students/import");
      await sweepPath(page, "/app/students/new");
    } finally {
      await context.close();
    }
  });

  test("staff location edit page loads @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/locations/${SMOKE.branchMainId}/edit`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page).toHaveURL(
        new RegExp(`/app/locations/${SMOKE.branchMainId}/edit`),
      );
    } finally {
      await context.close();
    }
  });
});
