import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("attendance HTTP @http", () => {
  test("trainer marks attendance and reads roster @http", async () => {
    const sessionId = SEED.sessionAttendanceId;
    const studentId = SEED.users.STUDENT.id;

    const marked = await expectOk<{ status: string }>(
      "TRAINER",
      "/attendance/mark",
      {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          studentId,
          status: "PRESENT",
          source: "TRAINER",
        }),
      },
    );
    expect(marked.status).toBe("PRESENT");

    const roster = await expectOk<
      Array<{
        studentId: string;
        attendance?: { status: string } | null;
      }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);

    expect(roster.length).toBeGreaterThan(0);
    expect(
      roster.find((row) => row.studentId === studentId)?.attendance?.status,
    ).toBe("PRESENT");
  });

  test("trainer mark-all-present succeeds @http", async () => {
    const sessionId = SEED.sessionAttendanceId;
    const result = await expectOk<{ marked: number; failed: number }>(
      "TRAINER",
      `/attendance/session/${sessionId}/mark-all-present`,
      { method: "POST" },
    );
    expect(result.failed).toBe(0);
  });

  test("student cannot mark attendance @http", async () => {
    await expectStatus("STUDENT", "/attendance/mark", 403, {
      method: "POST",
      body: JSON.stringify({
        sessionId: SEED.sessionAttendanceId,
        studentId: SEED.users.STUDENT.id,
        status: "PRESENT",
        source: "TRAINER",
      }),
    });
  });
});
