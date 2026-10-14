import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("attendance missed session @critical", () => {
  test("trainer marks student absent and student receives MISSED_SESSION @critical", async ({
    browser,
  }) => {
    const sessionId = SEED.sessionAttendanceId;
    const studentId = SEED.users.STUDENT.id;
    const studentName = SEED.users.STUDENT.name;

    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentId,
        status: "PRESENT",
        source: "TRAINER",
      }),
    }).catch(() => undefined);

    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        studentId,
        status: "ABSENT",
        source: "TRAINER",
      }),
    });

    const notifications = await apiRequest<{
      items: Array<{ type: string; title?: string; body?: string }>;
    }>("STUDENT", "/notifications?limit=20");

    expect(
      notifications.items.some(
        (item) =>
          item.type === "MISSED_SESSION" ||
          /missed session/i.test(item.title ?? "") ||
          /marked absent/i.test(item.body ?? ""),
      ),
    ).toBe(true);

    const roster = await apiRequest<
      Array<{
        student: { id: string; name: string };
        attendance?: { status: string } | null;
      }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);

    expect(
      roster.some(
        (entry) =>
          entry.student.id === studentId &&
          entry.attendance?.status === "ABSENT",
      ),
    ).toBe(true);

    const trainerContext = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const trainerPage = await trainerContext.newPage();
    await trainerPage.goto(`/app/sessions/${sessionId}/attendance`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(trainerPage);
    await expect(trainerPage).toHaveURL(
      new RegExp(`/sessions/${sessionId}/attendance`),
    );
    await expect(
      trainerPage.getByRole("heading", { name: /session attendance/i }),
    ).toBeVisible();
    await expect(
      trainerPage.getByText(studentName, { exact: true }),
    ).toBeVisible();
    await expect(
      trainerPage.getByRole("row", { name: new RegExp(studentName, "i") }),
    ).toContainText(/absent/i);
    await trainerContext.close();
  });
});
