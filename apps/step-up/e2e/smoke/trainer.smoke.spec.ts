import type { Page } from "@playwright/test";
import {
  apiRequest,
  authFile,
  canJoinPostpaidNow,
  closeSmokeContext,
  enrollPostpaid,
  enrollUnpaidOnPostpaidBatch,
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

/** Seed student has a pending invoice; unpaid rows open AppSheet confirm. */
async function confirmUnpaidMarkIfShown(page: Page) {
  const confirm = page.getByTestId("confirm-unpaid-mark");
  if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
    await confirm.click();
  }
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
      await sweepPath(page, "/app/payments", {
        denyRedirect: /\/app\/?$/,
      });
      await sweepPath(page, "/app/students/import", {
        denyRedirect: /\/app/,
      });
      await expect(page.locator('a[href="/app/settings"]')).toHaveCount(0);
      await expect(page.locator('a[href="/app/invoices"]')).toHaveCount(0);
      await expect(page.locator('a[href="/app/payments"]')).toHaveCount(0);

      await page.goto(`/app/batches/${SMOKE.kidsBatchId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page.getByLabel("Batch revenue")).toHaveCount(0);
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
      const responsePromise = waitForApiResponse(page, {
        method: "POST",
        pathIncludes: "/attendance/mark",
      });
      await presentBtn.click();
      await confirmUnpaidMarkIfShown(page);
      const response = await responsePromise;
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
    test.setTimeout(180_000);
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const { student, invoice, sessionId } = await enrollUnpaidOnPostpaidBatch(
      cleanup,
      {
        name: `Smoke Unpaid ${stamp}`,
      },
    );
    expect(invoice.status).toBe("PENDING");

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
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      await expect(page.getByText("Not paid").first()).toBeVisible();
      const presentBtn = page.getByTestId(`mark-present-${student.id}`);
      await expect(presentBtn).toBeVisible();
      await presentBtn.click();

      const confirm = page.getByTestId("confirm-unpaid-mark");
      await expect(confirm).toBeVisible();
      await expect(page.getByText(/unpaid/i).first()).toBeVisible();

      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/attendance/mark",
        }),
        confirm.click(),
      ]);
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
      await closeSmokeContext(context, cleanup);
    }
  });

  test("after mark-paid unpaid badge clears on roster @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const { student, invoice, sessionId } = await enrollUnpaidOnPostpaidBatch(
      cleanup,
      {
        name: `Smoke After Pay ${stamp}`,
      },
    );
    expect(invoice.status).toBe("PENDING");

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const row = page.getByTestId(`attendance-row-${student.id}`);
      await expect(row).toBeVisible();
      await expect(row.getByText("Not paid")).toBeVisible();

      await apiRequest("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      await expect
        .poll(async () => {
          const latest = await apiRequest<
            Array<{ studentId: string; monthlyUnpaid?: boolean }>
          >("TRAINER", `/attendance/session/${sessionId}/roster`);
          return latest.find((entry) => entry.studentId === student.id)
            ?.monthlyUnpaid;
        })
        .toBe(false);

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(row).toBeVisible();
      await expect(row.getByText("Not paid")).toHaveCount(0);
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("mid-month enrollee marks present without unpaid confirm @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new SmokeDataCleanup();
    const stamp = Date.now();
    const { student, sessionId, batchId } = await enrollPostpaid(cleanup, {
      name: `Smoke Postpaid ${stamp}`,
    });
    expect(batchId).toBeTruthy();

    const roster = await apiRequest<
      Array<{ studentId: string; monthlyUnpaid?: boolean }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);
    expect(
      roster.find((row) => row.studentId === student.id)?.monthlyUnpaid,
    ).toBe(false);

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/sessions/${sessionId}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const presentBtn = page.getByTestId(`mark-present-${student.id}`);
      await expect(presentBtn).toBeVisible();
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/attendance/mark",
        }),
        presentBtn.click(),
      ]);
      expect(response.ok()).toBeTruthy();
      await expect(page.getByTestId("confirm-unpaid-mark")).toHaveCount(0);
    } finally {
      await closeSmokeContext(context, cleanup);
    }
  });

  test("trainer can change and delete session from attendance @smoke", async ({
    browser,
  }) => {
    const start = new Date();
    start.setDate(start.getDate() + 21);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    const session = await apiRequest<{ id: string; batchId: string }>(
      "TRAINER",
      "/sessions",
      {
        method: "POST",
        body: JSON.stringify({
          batchId: SMOKE.kidsBatchId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          type: "REGULAR",
        }),
      },
    );

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    try {
      await page.goto(`/app/sessions/${session.id}/attendance`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      await page.getByTestId("attendance-session-actions").click();
      await page.getByRole("menuitem", { name: "Change date/time" }).click();

      const nextStart = new Date(start);
      nextStart.setHours(12, 0, 0, 0);
      const nextEnd = new Date(nextStart);
      nextEnd.setHours(13, 0, 0, 0);
      const toLocal = (value: Date) => {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        const hours = String(value.getHours()).padStart(2, "0");
        const minutes = String(value.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      await page
        .getByTestId("session-change-starts-at")
        .fill(toLocal(nextStart));
      await page.getByTestId("session-change-ends-at").fill(toLocal(nextEnd));

      const patchPromise = waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/sessions/${session.id}`,
      });
      await page.getByTestId("confirm-change-session").click();
      expect((await patchPromise).ok()).toBeTruthy();

      await page.getByTestId("attendance-session-actions").click();
      await page.getByRole("menuitem", { name: "Delete session" }).click();
      const deletePromise = waitForApiResponse(page, {
        method: "DELETE",
        pathIncludes: `/sessions/${session.id}`,
      });
      await page.getByTestId("confirm-delete-session").click();
      expect((await deletePromise).ok()).toBeTruthy();
      await expect(page).toHaveURL(
        new RegExp(`/app/batches/${session.batchId}`),
      );
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
        const responsePromise = waitForApiResponse(page, {
          method: "POST",
          pathIncludes: `/attendance/session/${sessionId}/mark-all-present`,
        });
        await markAll.click();
        await confirmUnpaidMarkIfShown(page);
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
      }
    } finally {
      await context.close();
    }
  });
});
