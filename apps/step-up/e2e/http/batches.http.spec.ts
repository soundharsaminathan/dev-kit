import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

test.describe("batches HTTP @http", () => {
  test("staff creates and removes a batch with plans @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    const name = `HTTP Batch ${stamp}`;
    try {
      // Far-future unique slot avoids schedule conflicts on the e2e main branch.
      const created = await expectOk<{
        id: string;
        name: string;
      }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "HTTP integration batch" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [0],
            startDate: "2027-01-03",
            endDate: "2027-03-28",
            startTime: "06:15",
            endTime: "07:00",
            utcOffsetMinutes: 0,
          },
          capacity: 8,
          enrollmentMode: "SELF_JOIN",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(created.id);

      expect(created.id).toBeTruthy();
      expect(created.name).toBe(name);
    } finally {
      await cleanup.dispose();
    }
  });

  test("student can enroll into a self-join batch with a package @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Trial Enrollee", cleanup);
      const enrollment = await expectOk<{
        batchId: string;
        studentId: string;
        invoice: { id: string; status: string; amount: number };
      }>(
        "STUDENT",
        `/batches/${SEED.trialBatchId}/enroll`,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            subscriptionId: SEED.adultPlanIds[0],
          }),
        },
        { userId: student.id },
      );
      expect(enrollment.batchId).toBe(SEED.trialBatchId);
      expect(enrollment.studentId).toBe(student.id);
      expect(enrollment.invoice.status).toBe("PENDING");
      expect(enrollment.invoice.amount).toBeGreaterThan(0);
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot create a batch @http", async () => {
    await expectStatus("STUDENT", "/batches", 403, {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STUDENT.studioId,
        name: "Forbidden batch",
        category: "ADULTS",
        branchId: SEED.branchMainId,
        trainerIds: [SEED.users.TRAINER.id],
        danceCategories: [{ name: "Hip Hop", description: "Nope" }],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: "2026-07-01",
          endDate: "2026-12-31",
          startTime: "18:00",
          endTime: "19:00",
          utcOffsetMinutes: 0,
        },
        capacity: 10,
        enrollmentMode: "SELF_JOIN",
        subscriptionIds: [...SEED.adultPlanIds],
      }),
    });
  });

  test("student cannot self-enroll into STAFF_ONLY kids batch @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Staff Only Deny", cleanup);
      const result = await expectStatus(
        "STUDENT",
        `/batches/${SEED.kidsBatchId}/enroll`,
        400,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            subscriptionId: SEED.kidPlanIds[0],
          }),
        },
        { userId: student.id },
      );
      expect(result.text).toMatch(/self-enrollment/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff unenrolls student from active batch while past roster retains them @http", async () => {
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    try {
      const student = await createHttpStudent("HTTP Unenroll", cleanup);
      await expectOk("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      });

      const before = await expectOk<Array<{ studentId: string }>>(
        "TRAINER",
        `/attendance/session/${sessionId}/roster`,
      );
      expect(before.some((row) => row.studentId === student.id)).toBe(true);

      await expectOk("STAFF", `/batches/${SEED.kidsBatchId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: student.id }),
      });

      // Seed attendance session is already in progress/past, so ENDED enrollments
      // remain on that roster (endedAt > session.startsAt). Active batch membership
      // is cleared instead.
      const after = await expectOk<Array<{ studentId: string }>>(
        "TRAINER",
        `/attendance/session/${sessionId}/roster`,
      );
      expect(after.some((row) => row.studentId === student.id)).toBe(true);

      const batch = await expectOk<{
        enrollments: Array<{ studentId: string }>;
      }>("STAFF", `/batches/${SEED.kidsBatchId}`);
      expect(
        batch.enrollments.some((row) => row.studentId === student.id),
      ).toBe(false);
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot unenroll from a batch @http", async () => {
    await expectStatus(
      "STUDENT",
      `/batches/${SEED.kidsBatchId}/unenroll`,
      403,
      {
        method: "POST",
        body: JSON.stringify({ studentId: SEED.users.STUDENT.id }),
      },
    );
  });

  test("trainer switches a student to another same-category batch @http", async () => {
    const cleanup = new TestDataCleanup();
    const studentId = SEED.users.STUDENT.id;
    const fromBatchId = SEED.kidsBatchId;
    let toBatchId: string | undefined;

    try {
      let lastError: unknown;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const stamp = Date.now() + attempt * 97_000;
        const hour = String(5 + ((stamp + attempt) % 8)).padStart(2, "0");
        const minute = String((stamp + attempt * 11) % 60).padStart(2, "0");
        const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
        const endHour = String(
          Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
        ).padStart(2, "0");
        try {
          const toBatch = await expectOk<{ id: string }>("STAFF", "/batches", {
            method: "POST",
            body: JSON.stringify({
              studioId: SEED.users.STAFF.studioId,
              name: `Switch To ${stamp}`,
              category: "KIDS",
              branchId: SEED.branchEastId,
              trainerIds: [SEED.users.TRAINER_2.id],
              danceCategories: [{ name: "Hip Hop", description: "Switch to" }],
              scheduleJson: {
                frequency: "WEEKLY",
                weekdays: [(attempt + 2) % 7],
                startDate: "2028-02-01",
                endDate: "2028-05-30",
                startTime: `${hour}:${minute}`,
                endTime: `${endHour}:${endMinute}`,
                utcOffsetMinutes: 0,
              },
              capacity: 8,
              enrollmentMode: "STAFF_ONLY",
              subscriptionIds: [...SEED.kidPlanIds],
              active: true,
              certificationEnabled: false,
            }),
          });
          toBatchId = toBatch.id;
          cleanup.trackBatch(toBatch.id);
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (
            !String(error).includes("409") &&
            !String(error).includes("Conflict")
          ) {
            throw error;
          }
        }
      }
      if (!toBatchId) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Could not create switch target batch");
      }

      const targets = await expectOk<{
        targets: Array<{ id: string }>;
      }>(
        "TRAINER",
        `/batches/${fromBatchId}/switch-targets?studentId=${encodeURIComponent(studentId)}`,
      );
      expect(targets.targets.some((t) => t.id === toBatchId)).toBe(true);

      const switched = await expectOk<{
        batchId: string;
        studentId: string;
      }>("TRAINER", `/batches/${fromBatchId}/switch`, {
        method: "POST",
        body: JSON.stringify({
          studentId,
          toBatchId,
        }),
      });
      expect(switched).toMatchObject({
        batchId: toBatchId,
        studentId,
      });

      const fromDetail = await expectOk<{
        enrollments: Array<{ studentId: string }>;
      }>("TRAINER", `/batches/${fromBatchId}`);
      expect(
        fromDetail.enrollments.some((row) => row.studentId === studentId),
      ).toBe(false);

      const toDetail = await expectOk<{
        enrollments: Array<{ studentId: string }>;
      }>("TRAINER", `/batches/${toBatchId}`);
      expect(
        toDetail.enrollments.some((row) => row.studentId === studentId),
      ).toBe(true);

      // Restore seed enrollment so later tests still see the student on kids.
      await expectOk("TRAINER", `/batches/${toBatchId}/switch`, {
        method: "POST",
        body: JSON.stringify({
          studentId,
          toBatchId: fromBatchId,
        }),
      });
    } finally {
      await cleanup.dispose();
    }
  });
});
