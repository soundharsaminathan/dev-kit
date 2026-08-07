import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
  TestDataCleanup,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

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
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.goto(`/app/sessions/${sessionId}/attendance`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);
    await expect(
      page.getByRole("heading", { name: /session attendance/i }),
    ).toBeVisible();

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
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    const stamp = Date.now();
    try {
      const student = await apiRequest<{ id: string; name: string }>(
        "OWNER",
        "/users",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Critical Unpaid ${stamp}`,
            email: `critical-unpaid-${stamp}@stepup.dev`,
            gender: "FEMALE",
            ageRange: "UNDER_10",
            styles: ["Hip Hop"],
          }),
        },
      );
      cleanup.trackStudent(student.id);

      const enrollment = await apiRequest<{
        invoice: { id: string; status: string };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      });
      expect(enrollment.invoice.status).toBe("PENDING");

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
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });
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

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: `/attendance/session/${sessionId}/mark-all-present`,
      }),
      markAll.click(),
    ]);
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
