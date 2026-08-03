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
});
