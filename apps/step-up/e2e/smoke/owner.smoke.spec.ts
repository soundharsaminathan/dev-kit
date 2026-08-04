import fs from "node:fs";
import {
  apiRequest,
  authFile,
  expect,
  SMOKE,
  SmokeDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "./fixtures";
import { sweepPath, sweepPaths } from "./route-sweep";

const FUNNEL_TILES = [
  "active",
  "signedInOnly",
  "trialAttended",
  "completedWithoutPlan",
] as const;

const OWNER_PATHS = [
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
  "/app/bookings/new",
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
  "/app/settings/branding",
  "/app/settings/theme",
  "/app/settings/team",
  "/app/settings/payments",
  "/app/settings/billing",
];

test.describe("owner smoke @smoke", () => {
  test("owner path sweep covers staff shell @smoke", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, OWNER_PATHS);
    } finally {
      await context.close();
    }
  });

  test("owner dashboard metric and funnel tiles @smoke", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      await expect(page.getByText(/here's your studio/i)).toBeVisible();

      const metrics = page.getByTestId("owner-metric-tiles");
      await expect(metrics).toBeVisible();
      for (const label of [
        "Batches",
        "Students",
        "Trainers",
        "Subscriptions",
      ]) {
        await expect(metrics.getByText(label, { exact: true })).toBeVisible();
      }

      const funnel = page.getByTestId("funnel-tiles");
      await expect(funnel).toBeVisible();
      for (const key of FUNNEL_TILES) {
        await expect(page.getByTestId(`funnel-tile-${key}`)).toBeVisible();
      }

      await page.getByRole("button", { name: /^this month$/i }).click();
      await expect(funnel).toBeVisible();
      await page.getByRole("button", { name: /^lifetime$/i }).click();
    } finally {
      await context.close();
    }
  });

  test("owner creates batch via API and sees it in list @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const name = `Smoke Owner Batch ${stamp}`;
    const start = new Date(Date.UTC(2028, 2, 5));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);

    const created = await apiRequest<{ id: string }>("OWNER", "/batches", {
      method: "POST",
      body: JSON.stringify({
        studioId: SMOKE.studioId,
        name,
        coverImageUrl:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
        category: "ADULTS",
        branchId: SMOKE.branchMainId,
        trainerIds: [SMOKE.users.TRAINER.id],
        danceCategories: [
          { name: "Hip Hop", description: "Smoke owner batch" },
        ],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          startTime: "09:00",
          endTime: "10:00",
          utcOffsetMinutes: 0,
        },
        capacity: 12,
        enrollmentMode: "SELF_JOIN",
        subscriptionIds: [...SMOKE.adultPlanIds],
        active: true,
        certificationEnabled: false,
      }),
    });
    cleanup.trackBatch(created.id);

    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/batches", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page.getByText(name)).toBeVisible();
      await sweepPath(page, `/app/batches/${created.id}`);
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("owner marks invoice paid @smoke", async ({ browser }) => {
    const invoice = await apiRequest<{ id: string; status: string }>(
      "OWNER",
      "/billing",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: SMOKE.studioId,
          studentId: SMOKE.users.STUDENT.id,
          amount: 1200,
        }),
      },
    );
    expect(invoice.status).toBe("PENDING");

    const context = await browser.newContext({
      storageState: authFile("OWNER"),
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
    }
  });

  test("owner settings profile loads @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();
    try {
      await page.goto("/app/settings/profile", {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/app\/settings\/profile/);
      await expect(
        page
          .getByRole("heading")
          .or(page.getByLabel(/studio/i))
          .first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

// Ensure auth file exists for the describe (setup project dependency).
test.beforeAll(() => {
  if (!fs.existsSync(authFile("OWNER"))) {
    throw new Error("OWNER auth state missing — smoke-setup must run first");
  }
});
