import {
  apiRequest,
  authFile,
  expect,
  TestDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { canJoinPostpaidNow } from "../fixtures/billing-calendar";
import { SEED } from "../fixtures/seed";
import { enrollUnpaidOnPostpaidBatch } from "../http/billing-fixtures";

test.describe("trainer attendance UI @critical", () => {
  test("trainer marks student present through UI @critical", async ({
    browser,
  }) => {
    const sessionId = SEED.sessionAttendanceId;
    const studentId = SEED.users.STUDENT.id;

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
    await page.goto(`/app/sessions/${sessionId}/attendance`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /session attendance/i }),
    ).toBeVisible();

    const presentBtn = page.getByTestId(`mark-present-${studentId}`);
    await expect(presentBtn).toBeVisible();

    const responsePromise = waitForApiResponse(page, {
      method: "POST",
      pathIncludes: "/attendance/mark",
    });
    await presentBtn.click();
    // Seed student often has a DUE membership — confirm unpaid interstitial.
    const confirm = page.getByTestId("confirm-unpaid-mark");
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click();
    }
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const roster = await apiRequest<
      Array<{
        studentId: string;
        attendance?: { status: string } | null;
      }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);
    const entry = roster.find((row) => row.studentId === studentId);
    expect(entry?.attendance?.status).toBe("PRESENT");

    await context.close();
  });

  test("trainer confirms unpaid enrollee then marks present @critical", async ({
    browser,
  }) => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const { student, invoice, sessionId } = await enrollUnpaidOnPostpaidBatch(
        cleanup,
        {
          studentName: `Critical Unpaid ${stamp}`,
        },
      );
      expect(invoice.status).toBe("PENDING");

      const rosterBefore = await apiRequest<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
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
        await context.close();
      }
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer can mark all unmarked present through UI @critical", async ({
    browser,
  }) => {
    const sessionId = SEED.sessionAttendanceId;

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto(`/app/sessions/${sessionId}/attendance`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);

    const markAll = page.getByTestId("mark-all-present");
    if ((await markAll.count()) === 0) {
      // Everyone already marked — exercise API path then reload UI shell.
      const result = await apiRequest<{ marked: number; failed: number }>(
        "TRAINER",
        `/attendance/session/${sessionId}/mark-all-present`,
        { method: "POST" },
      );
      expect(result.failed).toBe(0);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: /session attendance/i }),
      ).toBeVisible();
      await context.close();
      return;
    }

    const responsePromise = waitForApiResponse(page, {
      method: "POST",
      pathIncludes: `/attendance/session/${sessionId}/mark-all-present`,
    });
    await markAll.click();
    const confirm = page.getByTestId("confirm-unpaid-mark");
    if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirm.click();
    }
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const roster = await apiRequest<
      Array<{ attendance?: { status: string } | null }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);
    expect(roster.length).toBeGreaterThan(0);
    expect(
      roster.every((entry) => entry.attendance?.status === "PRESENT"),
    ).toBe(true);

    await context.close();
  });
});
