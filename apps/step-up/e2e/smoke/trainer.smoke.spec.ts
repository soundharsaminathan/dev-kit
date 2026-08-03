import {
  apiRequest,
  authFile,
  expect,
  SMOKE,
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

  test("trainer mark-all-present @smoke", async ({ browser }) => {
    const sessionId = SMOKE.sessionAttendanceId;
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
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
