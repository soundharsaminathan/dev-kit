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

  test("student can trial-enroll into a self-join batch @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Trial Enrollee", cleanup);
      const enrollment = await expectOk<{
        isTrial: boolean;
        trialSessionIds: string[] | null;
      }>(
        "STUDENT",
        `/batches/${SEED.trialBatchId}/enroll`,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            isTrial: true,
          }),
        },
        { userId: student.id },
      );
      expect(enrollment.isTrial).toBe(true);
      expect(Array.isArray(enrollment.trialSessionIds)).toBe(true);
      expect(enrollment.trialSessionIds!.length).toBeGreaterThan(0);

      await expectStatus(
        "STUDENT",
        `/batches/${SEED.beginnerBatchId}/enroll`,
        409,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            isTrial: true,
          }),
        },
        { userId: student.id },
      );
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

  test("trainer switches a trial student to another same-category batch @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const toBatch = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `Switch To ${stamp}`,
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [{ name: "Hip Hop", description: "Switch to" }],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [0],
            startDate: "2027-11-07",
            endDate: "2028-01-30",
            startTime: "06:25",
            endTime: "07:10",
            utcOffsetMinutes: 0,
          },
          capacity: 8,
          enrollmentMode: "STAFF_ONLY",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(toBatch.id);

      const student = await createHttpStudent(`Switch Trial ${stamp}`, cleanup);
      const fromBatchId = SEED.trialBatchId;

      await expectOk("TRAINER", `/batches/${fromBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          isTrial: true,
        }),
      });

      const targets = await expectOk<{
        isTrial: boolean;
        targets: Array<{ id: string }>;
      }>(
        "TRAINER",
        `/batches/${fromBatchId}/switch-targets?studentId=${encodeURIComponent(student.id)}`,
      );
      expect(targets.isTrial).toBe(true);
      expect(targets.targets.some((t) => t.id === toBatch.id)).toBe(true);

      const switched = await expectOk<{
        batchId: string;
        studentId: string;
        isTrial: boolean;
      }>("TRAINER", `/batches/${fromBatchId}/switch`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          toBatchId: toBatch.id,
        }),
      });
      expect(switched).toMatchObject({
        batchId: toBatch.id,
        studentId: student.id,
        isTrial: true,
      });

      const fromDetail = await expectOk<{
        enrollments: Array<{ studentId: string }>;
      }>("TRAINER", `/batches/${fromBatchId}`);
      expect(
        fromDetail.enrollments.some((row) => row.studentId === student.id),
      ).toBe(false);

      const toDetail = await expectOk<{
        enrollments: Array<{ studentId: string; isTrial?: boolean }>;
      }>("TRAINER", `/batches/${toBatch.id}`);
      const enrollment = toDetail.enrollments.find(
        (row) => row.studentId === student.id,
      );
      expect(enrollment?.isTrial).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });
});
