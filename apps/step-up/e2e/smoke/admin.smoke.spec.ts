import {
  apiBaseUrl,
  apiRequest,
  authFile,
  bearerFor,
  closeSmokeContext,
  createCalendarBatch,
  enrollPrepaid,
  expect,
  SMOKE,
  SmokeDataCleanup,
  test,
  unwrapPage,
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
  "/app/leads",
  "/app/trainers",
  "/app/trainers/new",
  "/app/bookings",
  `/app/sessions/${SMOKE.sessionAttendanceId}/attendance`,
  "/app/calendar",
  "/app/payments",
  "/app/expenses",
  "/app/expenses/list",
  "/app/expenses/reports",
  "/app/expenses/categories",
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

async function createSmokeFamilyKid(name: string) {
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

async function openInvoicesAndWaitFor(
  page: import("@playwright/test").Page,
  testId: string,
) {
  await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 30_000 });
}

async function createPendingTrialLead(cleanup: SmokeDataCleanup) {
  const slots = await apiRequest<Array<{ sessionId: string }>>(
    "STAFF",
    `/sessions/studio/${SMOKE.studioId}/trial`,
  );
  const sessionId = slots[0]?.sessionId;
  if (!sessionId) {
    throw new Error("No upcoming trial session for smoke lead");
  }

  const stamp = Date.now();
  const lead = await apiRequest<{
    id: string;
    name: string;
    trialBooking: { id: string; status: string } | null;
  }>("STAFF", `/users/studio/${SMOKE.studioId}/leads`, {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Confirm ${stamp}`,
      phone: `900${String(stamp).slice(-7)}`,
      ageRange: "TWENTY_TO_FORTY",
      sessionId,
    }),
  });
  cleanup.trackStudent(lead.id);
  if (!lead.trialBooking) {
    throw new Error("Expected a pending trial booking on the smoke lead");
  }
  return { ...lead, trialBooking: lead.trialBooking };
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
    } finally {
      await context.close();
    }
  });

  test("staff cannot change GST percent @smoke", async () => {
    const token = await bearerFor("STAFF");
    const response = await fetch(
      `${apiBaseUrl()}/studios/${SMOKE.studioId}/settings`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gstPercent: 18 }),
      },
    );
    expect(response.status).toBe(403);
    expect(await response.text()).toMatch(
      /only owners can change gst percent/i,
    );
  });

  test("staff cannot double-mark an invoice paid @smoke", async () => {
    const cleanup = new SmokeDataCleanup();
    try {
      const stamp = Date.now();
      const { invoice } = await enrollPrepaid(cleanup, {
        name: `Smoke Paid Twice ${stamp}`,
      });
      await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      const token = await bearerFor("STAFF");
      const response = await fetch(
        `${apiBaseUrl()}/billing/${invoice.id}/paid`,
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
    const { invoice } = await enrollPrepaid(cleanup, {
      name: `Smoke Pay ${Date.now()}`,
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await openInvoicesAndWaitFor(page, `mark-paid-${invoice.id}`);
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
          const latest = await apiRequest<{ id: string; status: string }>(
            "STAFF",
            `/billing/${invoice.id}`,
          );
          return latest.status;
        })
        .toBe("PAID");
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff confirms pending trial from trial caller @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const lead = await createPendingTrialLead(cleanup);

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/leads", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      const confirm = page.getByTestId(`lead-confirm-session-${lead.id}`);
      await expect(confirm).toBeVisible({ timeout: 30_000 });

      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/bookings/${lead.trialBooking.id}/status`,
        }),
        confirm.click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await expect
        .poll(async () => {
          const latest = await apiRequest<{ status: string }>(
            "STAFF",
            `/bookings/${lead.trialBooking.id}`,
          );
          return latest.status;
        })
        .toBe("CONFIRMED");

      await expect(page.getByTestId(`lead-confirmed-${lead.id}`)).toBeVisible();
      await expect(
        page.getByTestId(`lead-confirm-session-${lead.id}`),
      ).toHaveCount(0);
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("already confirmed trial hides confirm on trial caller @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const lead = await createPendingTrialLead(cleanup);
    await apiRequest("STAFF", `/bookings/${lead.trialBooking.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CONFIRMED" }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/leads", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      await expect(page.getByText(lead.name).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId(`lead-confirmed-${lead.id}`)).toBeVisible();
      await expect(
        page.getByTestId(`lead-confirm-session-${lead.id}`),
      ).toHaveCount(0);
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff issues partial refund from invoices @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const { invoice } = await enrollPrepaid(cleanup, {
      name: `Smoke Refund ${Date.now()}`,
    });
    await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await openInvoicesAndWaitFor(page, `refund-invoice-${invoice.id}`);
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

      await page.getByRole("tab", { name: /^refunds$/i }).click();
      await expect(
        page
          .getByRole("tabpanel", { name: /^refunds$/i })
          .getByTestId(`print-invoice-${invoice.id}`),
      ).toBeVisible();
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff refund amount above bill is blocked @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const { invoice } = await enrollPrepaid(cleanup, {
      name: `Smoke Refund Cap ${Date.now()}`,
    });
    await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await openInvoicesAndWaitFor(page, `refund-invoice-${invoice.id}`);
      await page.getByTestId(`refund-invoice-${invoice.id}`).click();
      await page.getByRole("menuitem", { name: "Refund" }).click();
      await page
        .getByTestId("refund-amount-input")
        .fill(String(invoice.amount + 1));
      await page.getByTestId("confirm-refund-invoice").click();
      await expect(page.getByText("Refund too high")).toBeVisible();

      const latest = unwrapPage(
        await apiRequest<
          | Array<{ id: string; refundedAmount?: number }>
          | { items: Array<{ id: string; refundedAmount?: number }> }
        >("STAFF", `/billing/studio/${SMOKE.studioId}?limit=50`),
      );
      expect(
        latest.find((row) => row.id === invoice.id)?.refundedAmount ?? 0,
      ).toBe(0);
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff unenrolls student from profile batches @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const student = await apiRequest<{ id: string }>("OWNER", "/users", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke Unenroll ${stamp}`,
        email: `smoke-unenroll-${stamp}@stepup.dev`,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    });
    cleanup.trackStudent(student.id);
    await apiRequest("STAFF", `/batches/${SMOKE.beginnerBatchId}/enroll`, {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        subscriptionId: SMOKE.adultPlanIds[0],
      }),
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/students/${student.id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      await expect(
        page.getByTestId(`unenroll-batch-${SMOKE.beginnerBatchId}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`switch-batch-${SMOKE.beginnerBatchId}`),
      ).toBeVisible();

      await page.getByTestId(`unenroll-batch-${SMOKE.beginnerBatchId}`).click();
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/batches/${SMOKE.beginnerBatchId}/unenroll`,
        }),
        page.getByTestId("confirm-unenroll-batch").click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await expect(page.getByText("Unenrolled").first()).toBeVisible();
      await expect(
        page.getByTestId(`unenroll-batch-${SMOKE.beginnerBatchId}`),
      ).toHaveCount(0);
      await expect(
        page.getByTestId(`switch-batch-${SMOKE.beginnerBatchId}`),
      ).toHaveCount(0);

      await page.goto(`/app/batches/${SMOKE.beginnerBatchId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await page.getByTestId("roster-tab-inactive").click();
      await expect(
        page.getByTestId(`inactive-reason-${student.id}`),
      ).toHaveText("Unenrolled");

      // Paid month stays ACTIVE after unenroll for inactive roster, but funnel
      // must still count them as Left batch — not Signed in only.
      const directory = await apiRequest<
        Array<{ id: string; funnelStage: string }>
      >(
        "OWNER",
        `/users/studio/${SMOKE.users.OWNER.studioId}/student-directory?period=lifetime`,
      );
      const row = directory.find((entry) => entry.id === student.id);
      expect(row?.funnelStage).toBe("leftBatch");
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff opens batch attendance tab with monthly counts @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/batches/${SMOKE.kidsBatchId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      await page.getByTestId("roster-tab-attendance").click();
      await expect(page.getByTestId("batch-attendance-tab")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "This month" }),
      ).toBeVisible();

      const count = page.getByTestId(
        `attendance-count-${SMOKE.users.STUDENT.id}`,
      );
      await expect(count).toBeVisible();
      await expect(count).toHaveText(/\d+\s*\/\s*\d+/);
    } finally {
      await closeSmokeContext(context);
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
      await closeSmokeContext(context, cleanup);
    }
  });

  test("staff combines unpaid family invoices and collects payment @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const kidA = await createSmokeFamilyKid(`Smoke Combine A ${stamp}`);
    const kidB = await createSmokeFamilyKid(`Smoke Combine B ${stamp}`);
    cleanup.trackStudent(kidA.id);
    cleanup.trackStudent(kidB.id);
    const kidsBatch = await createCalendarBatch(cleanup, {
      kind: "prepaid",
      category: "KIDS",
      capacity: 8,
    });
    const enrollA = await enrollPrepaid(cleanup, {
      category: "KIDS",
      studentId: kidA.id,
      batchId: kidsBatch.id,
    });
    const enrollB = await enrollPrepaid(cleanup, {
      category: "KIDS",
      studentId: kidB.id,
      batchId: kidsBatch.id,
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      await page.getByRole("tab", { name: /^family$/i }).click();
      await expect(page.getByTestId("sell-family-pack")).toHaveCount(0);
      await page.getByTestId(`family-group-${SMOKE.users.STUDENT.id}`).click();
      await expect(
        page.getByRole("heading", { name: /combine ·/i }),
      ).toBeVisible();

      await expect(
        page.getByTestId(`combine-invoice-${enrollA.invoice.id}`),
      ).toBeVisible({ timeout: 30_000 });
      await page
        .getByTestId(`combine-invoice-${enrollA.invoice.id}`)
        .getByRole("checkbox")
        .click();
      await expect(page.getByTestId("confirm-family-combine")).toBeDisabled();
      await page
        .getByTestId(`combine-invoice-${enrollB.invoice.id}`)
        .getByRole("checkbox")
        .click();
      await page.getByTestId("family-combine-discount").fill("50");

      const [combineResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/billing/family-combine",
        }),
        page.getByTestId("confirm-family-combine").click(),
      ]);
      expect(combineResponse.ok()).toBeTruthy();
      const combined = (await combineResponse.json()) as { id: string };
      expect(combined.id).toBeTruthy();

      await expect(page.getByTestId("confirm-open-family-paid")).toBeVisible();
      await page.getByRole("checkbox", { name: /^Cash$/i }).click();
      await expect(page.getByTestId("confirm-open-family-paid")).toBeEnabled();
      const [paidResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/billing/${combined.id}/paid`,
        }),
        page.getByTestId("confirm-open-family-paid").click(),
      ]);
      expect(paidResponse.ok()).toBeTruthy();
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("individual collect opens family combine when sibling has unpaid invoice @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const kidA = await createSmokeFamilyKid(`Smoke Ind Combine A ${stamp}`);
    const kidB = await createSmokeFamilyKid(`Smoke Ind Combine B ${stamp}`);
    cleanup.trackStudent(kidA.id);
    cleanup.trackStudent(kidB.id);
    const kidsBatch = await createCalendarBatch(cleanup, {
      kind: "prepaid",
      category: "KIDS",
      capacity: 8,
    });
    const enrollA = await enrollPrepaid(cleanup, {
      category: "KIDS",
      studentId: kidA.id,
      batchId: kidsBatch.id,
    });
    const enrollB = await enrollPrepaid(cleanup, {
      category: "KIDS",
      studentId: kidB.id,
      batchId: kidsBatch.id,
    });

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await openInvoicesAndWaitFor(page, `mark-paid-${enrollA.invoice.id}`);
      await page.getByTestId(`mark-paid-${enrollA.invoice.id}`).click();

      await expect(
        page.getByRole("heading", { name: /combine ·/i }),
      ).toBeVisible();
      await expect(
        page.getByTestId(`combine-invoice-${enrollA.invoice.id}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`combine-invoice-${enrollB.invoice.id}`),
      ).toBeVisible();

      // Paying only the opened invoice (optional combine) still works.
      await page.getByTestId("confirm-family-combine").click();
      await expect(page.getByTestId("confirm-mark-paid")).toBeVisible();
      await page.getByRole("checkbox", { name: /^Cash$/i }).click();
      const [paidResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/billing/${enrollA.invoice.id}/paid`,
        }),
        page.getByTestId("confirm-mark-paid").click(),
      ]);
      expect(paidResponse.ok()).toBeTruthy();
    } finally {
      await closeSmokeContext(context, cleanup);
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

  test("staff edits an expense category in place @smoke", async ({
    browser,
  }) => {
    const stamp = Date.now();
    const originalName = `Smoke Props ${stamp}`;
    const renamed = `Smoke Stage ${stamp}`;
    const created = await apiRequest<{ id: string }>(
      "STAFF",
      "/expense-categories",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SMOKE.studioId,
          name: originalName,
        }),
      },
    );

    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/expenses/categories", {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await page.getByTestId(`edit-category-${created.id}`).click();
      await expect(page.getByTestId("category-name-input")).toHaveValue(
        originalName,
      );
      await page.getByTestId("category-name-input").fill(renamed);
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: `/expense-categories/${created.id}`,
        }),
        page.getByTestId("confirm-save-category").click(),
      ]);
      expect(response.ok()).toBeTruthy();
      await expect(page.getByText(renamed)).toBeVisible();
      await expect(page.getByText(originalName)).toHaveCount(0);
    } finally {
      await apiRequest("STAFF", `/expense-categories/${created.id}`, {
        method: "DELETE",
      }).catch(() => undefined);
      await closeSmokeContext(context);
    }
  });

  test("staff records an expense and is blocked without a category @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    try {
      const categoriesLoaded = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/expense-categories/studio/") &&
          response.ok(),
      );
      await page.goto("/app/expenses/list", {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await categoriesLoaded;
      await page.getByTestId("add-expense").click();
      const sheet = page.getByTestId("expense-form-sheet");
      await expect(sheet).toBeVisible();
      await sheet.getByTestId("expense-amount-input").fill("250");
      await sheet.getByTestId("confirm-save-expense").click();
      await expect(sheet.getByText(/choose a category/i)).toBeVisible();

      const categorySelect = sheet.getByTestId("expense-category-select");
      await expect(categorySelect).toBeEnabled();
      await categorySelect.click();
      await page
        .getByRole("listbox")
        .getByRole("option", { name: "Rent", exact: true })
        .click();
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/expenses",
        }),
        sheet.getByTestId("confirm-save-expense").click(),
      ]);
      expect(response.ok()).toBeTruthy();
      const created = (await response.json()) as { id?: string };
      if (created.id) {
        await apiRequest("STAFF", `/expenses/${created.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
    } finally {
      await closeSmokeContext(context);
    }
  });
});
