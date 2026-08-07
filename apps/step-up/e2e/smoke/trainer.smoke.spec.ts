import type { Page } from "@playwright/test";
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

const TRAINER_PATHS = [
  "/app",
  "/app/batches",
  `/app/batches/${SMOKE.kidsBatchId}`,
  `/app/sessions/${SMOKE.sessionAttendanceId}/attendance`,
  "/app/calendar",
  "/app/retention",
  "/app/feed",
  "/app/messages",
  `/app/messages/${SMOKE.conversationId}`,
  "/app/profile",
  "/app/profile/edit",
  "/app/profile/security",
];

/** Seed/unpaid roster rows trigger window.confirm; Playwright dismisses by default. */
function acceptUnpaidConfirmDialogs(page: Page) {
  page.on("dialog", (dialog) => {
    void dialog.accept();
  });
}

test.describe("trainer smoke @smoke", () => {
  test("trainer path sweep covers trainer shell @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await sweepPaths(page, TRAINER_PATHS);
    } finally {
      await context.close();
    }
  });

  test("trainer is denied staff-only paths @smoke", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await sweepPath(page, "/app/settings", {
        denyRedirect: /\/app\/?$/,
      });
      await sweepPath(page, "/app/invoices", {
        denyRedirect: /\/app\/?$/,
      });
      await sweepPath(page, "/app/students/import", {
        denyRedirect: /\/app/,
      });
      await expect(page.locator('a[href="/app/settings"]')).toHaveCount(0);
      await expect(page.locator('a[href="/app/invoices"]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("trainer marks student present @smoke", async ({ browser }) => {
    const sessionId = SMOKE.sessionAttendanceId;
    const studentId = SMOKE.users.STUDENT.id;

    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentId,
        status: "ABSENT",
        source: "TRAINER",
      }),
    });

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await acceptUnpaidConfirmDialogs(page);
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const presentBtn = page.getByTestId(`mark-present-${studentId}`);
      await expect(presentBtn).toBeVisible();
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/attendance/mark",
        }),
        presentBtn.click(),
      ]);
      expect(response.ok()).toBeTruthy();

      const roster = await apiRequest<
        Array<{ studentId: string; attendance?: { status: string } | null }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      const entry = roster.find((row) => row.studentId === studentId);
      expect(entry?.attendance?.status).toBe("PRESENT");
    } finally {
      await context.close();
    }
  });

  test("trainer confirms unpaid enrollee then marks present @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const sessionId = SMOKE.sessionAttendanceId;
    const stamp = Date.now();
    const student = await apiRequest<{ id: string; name: string }>(
      "OWNER",
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: `Smoke Unpaid ${stamp}`,
          email: `smoke-unpaid-${stamp}@stepup.dev`,
          gender: "FEMALE",
          ageRange: "UNDER_10",
          styles: ["Hip Hop"],
        }),
      },
    );
    cleanup.trackStudent(student.id);

    const enrollment = await apiRequest<{
      invoice: { id: string; status: string };
    }>("STAFF", `/batches/${SMOKE.kidsBatchId}/enroll`, {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        subscriptionId: SMOKE.kidPlanIds[0],
      }),
    });
    expect(enrollment.invoice.status).toBe("PENDING");

    const rosterBefore = await apiRequest<
      Array<{
        studentId: string;
        monthlyUnpaid?: boolean;
        student?: { name?: string };
      }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);
    expect(
      rosterBefore.find((row) => row.studentId === student.id)?.monthlyUnpaid,
    ).toBe(true);

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      const unpaidDialog = new Promise<string>((resolve) => {
        page.once("dialog", (dialog) => {
          const message = dialog.message();
          void dialog.accept();
          resolve(message);
        });
      });

      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      await expect(page.getByText("Not paid").first()).toBeVisible();
      const presentBtn = page.getByTestId(`mark-present-${student.id}`);
      await expect(presentBtn).toBeVisible();

      const [response, dialogMessage] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/attendance/mark",
        }),
        unpaidDialog,
        presentBtn.click(),
      ]);
      expect(dialogMessage).toMatch(/unpaid/i);
      expect(response.ok()).toBeTruthy();

      const rosterAfter = await apiRequest<
        Array<{
          studentId: string;
          monthlyUnpaid?: boolean;
          attendance?: { status: string } | null;
        }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      const entry = rosterAfter.find((row) => row.studentId === student.id);
      expect(entry?.monthlyUnpaid).toBe(true);
      expect(entry?.attendance?.status).toBe("PRESENT");
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("after mark-paid unpaid badge clears on roster @smoke", async ({
    browser,
  }) => {
    const cleanup = new SmokeDataCleanup();
    const sessionId = SMOKE.sessionAttendanceId;
    const stamp = Date.now();
    const student = await apiRequest<{ id: string; name: string }>(
      "OWNER",
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: `Smoke After Pay ${stamp}`,
          email: `smoke-after-pay-${stamp}@stepup.dev`,
          gender: "FEMALE",
          ageRange: "UNDER_10",
          styles: ["Hip Hop"],
        }),
      },
    );
    cleanup.trackStudent(student.id);

    const enrollment = await apiRequest<{
      invoice: { id: string; status: string };
    }>("STAFF", `/batches/${SMOKE.kidsBatchId}/enroll`, {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        subscriptionId: SMOKE.kidPlanIds[0],
      }),
    });
    expect(enrollment.invoice.status).toBe("PENDING");

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page.getByText(student.name)).toBeVisible();
      await expect(page.getByText("Not paid").first()).toBeVisible();

      await apiRequest("STAFF", `/billing/${enrollment.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page.getByText(student.name)).toBeVisible();

      const row = page.getByRole("row").filter({ hasText: student.name });
      await expect(row.getByText("Not paid")).toHaveCount(0);

      const roster = await apiRequest<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        roster.find((entry) => entry.studentId === student.id)?.monthlyUnpaid,
      ).toBe(false);
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });

  test("trainer mark-all-present @smoke", async ({ browser }) => {
    const sessionId = SMOKE.sessionAttendanceId;
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await acceptUnpaidConfirmDialogs(page);
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const markAll = page.getByTestId("mark-all-present");
      if ((await markAll.count()) === 0) {
        const result = await apiRequest<{ marked: number; failed: number }>(
          "TRAINER",
          `/attendance/session/${sessionId}/mark-all-present`,
          { method: "POST" },
        );
        expect(result.failed).toBe(0);
      } else {
        const [response] = await Promise.all([
          waitForApiResponse(page, {
            method: "POST",
            pathIncludes: `/attendance/session/${sessionId}/mark-all-present`,
          }),
          markAll.click(),
        ]);
        expect(response.ok()).toBeTruthy();
      }
    } finally {
      await context.close();
    }
  });
});
