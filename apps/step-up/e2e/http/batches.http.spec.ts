import { expect, test } from "@playwright/test";
import { apiBaseUrl, bearerFor, SEED } from "../fixtures/seed";
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

  test("unpaid staff enroll still appears on batch active roster @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("HTTP Unpaid Roster", cleanup);
      const enrollment = await expectOk<{
        invoice: { id: string; status: string };
      }>("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      });
      expect(enrollment.invoice.status).toBe("PENDING");

      const batch = await expectOk<{
        enrollmentCount: number;
        enrollments: Array<{ studentId: string; monthlyUnpaid?: boolean }>;
        inactiveEnrollments: Array<{ studentId: string }>;
      }>("STAFF", `/batches/${SEED.kidsBatchId}`);

      const row = batch.enrollments.find((item) => item.studentId === student.id);
      expect(row).toBeTruthy();
      expect(row?.monthlyUnpaid).toBe(true);
      expect(
        batch.inactiveEnrollments.some((item) => item.studentId === student.id),
      ).toBe(false);
      expect(batch.enrollmentCount).toBeGreaterThanOrEqual(
        batch.enrollments.length,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff bulk enrolls multiple students with pending invoices @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const studentA = await createHttpStudent("HTTP Bulk A", cleanup);
      const studentB = await createHttpStudent("HTTP Bulk B", cleanup);

      const result = await expectOk<{
        enrollments: Array<{
          studentId: string;
          invoice: { id: string; status: string };
        }>;
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/enroll-bulk`, {
        method: "POST",
        body: JSON.stringify({
          studentIds: [studentA.id, studentB.id],
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      expect(result.enrollments).toHaveLength(2);
      expect(result.enrollments.map((row) => row.studentId).sort()).toEqual(
        [studentA.id, studentB.id].sort(),
      );
      for (const row of result.enrollments) {
        expect(row.invoice.status).toBe("PENDING");
      }

      const batch = await expectOk<{
        enrollments: Array<{ studentId: string; monthlyUnpaid?: boolean }>;
      }>("STAFF", `/batches/${SEED.beginnerBatchId}`);
      expect(
        batch.enrollments.some((row) => row.studentId === studentA.id),
      ).toBe(true);
      expect(
        batch.enrollments.some((row) => row.studentId === studentB.id),
      ).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot call bulk enroll @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("HTTP Bulk Deny", cleanup);
      await expectStatus(
        "STUDENT",
        `/batches/${SEED.beginnerBatchId}/enroll-bulk`,
        403,
        {
          method: "POST",
          body: JSON.stringify({
            studentIds: [student.id],
            subscriptionId: SEED.adultPlanIds[0],
          }),
        },
        { userId: student.id },
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("bulk enroll rejects when any student is already enrolled @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const studentA = await createHttpStudent("HTTP Bulk Dup A", cleanup);
      const studentB = await createHttpStudent("HTTP Bulk Dup B", cleanup);

      await expectOk("STAFF", `/batches/${SEED.beginnerBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: studentA.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      const result = await expectStatus(
        "STAFF",
        `/batches/${SEED.beginnerBatchId}/enroll-bulk`,
        400,
        {
          method: "POST",
          body: JSON.stringify({
            studentIds: [studentA.id, studentB.id],
            subscriptionId: SEED.adultPlanIds[0],
          }),
        },
      );
      expect(result.text).toMatch(/already enrolled/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("bulk enroll rejects when batch lacks capacity @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const batch = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `HTTP Bulk Cap ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "Bulk capacity batch" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [1],
            startDate: "2027-02-01",
            endDate: "2027-04-30",
            startTime: "05:00",
            endTime: "05:45",
            utcOffsetMinutes: 0,
          },
          capacity: 1,
          enrollmentMode: "STAFF_ONLY",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(batch.id);

      const studentA = await createHttpStudent("HTTP Cap A", cleanup);
      const studentB = await createHttpStudent("HTTP Cap B", cleanup);

      const result = await expectStatus(
        "STAFF",
        `/batches/${batch.id}/enroll-bulk`,
        400,
        {
          method: "POST",
          body: JSON.stringify({
            studentIds: [studentA.id, studentB.id],
            subscriptionId: SEED.adultPlanIds[0],
          }),
        },
      );
      expect(result.text).toMatch(/capacity/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff unenrolls student from active batch while past roster retains them @http", async () => {
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    try {
      const student = await createHttpStudent("HTTP Unenroll", cleanup);
      const enrollment = await expectOk<{ invoice: { id: string } }>(
        "STAFF",
        `/batches/${SEED.kidsBatchId}/enroll`,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            subscriptionId: SEED.kidPlanIds[0],
          }),
        },
      );
      // Inactive roster requires a still-active membership month after unenroll.
      await expectOk("STAFF", `/billing/${enrollment.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
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
        inactiveEnrollments: Array<{
          studentId: string;
          inactiveReason: string;
        }>;
      }>("STAFF", `/batches/${SEED.kidsBatchId}`);
      expect(
        batch.enrollments.some((row) => row.studentId === student.id),
      ).toBe(false);
      expect(
        batch.inactiveEnrollments.some(
          (row) =>
            row.studentId === student.id && row.inactiveReason === "UNENROLLED",
        ),
      ).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("kids batch seed exposes inactive moved and unenrolled roster rows @http", async () => {
    const batch = await expectOk<{
      enrollments: Array<{ studentId: string }>;
      inactiveEnrollments: Array<{
        studentId: string;
        inactiveReason: string;
      }>;
    }>("STAFF", `/batches/${SEED.kidsBatchId}`);

    expect(
      batch.enrollments.some((row) => row.studentId === SEED.users.STUDENT.id),
    ).toBe(true);
    expect(
      batch.inactiveEnrollments.some(
        (row) =>
          row.studentId === SEED.users.STUDENT_UNENROLLED.id &&
          row.inactiveReason === "UNENROLLED",
      ),
    ).toBe(true);
    expect(
      batch.inactiveEnrollments.some(
        (row) =>
          row.studentId === SEED.users.STUDENT_MOVED.id &&
          row.inactiveReason === "MOVED",
      ),
    ).toBe(true);
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

  // Seed STUDENT enrollment on kids batch is shared mutable state — serialize
  // switch mutations so they cannot race each other under fullyParallel.
  test.describe("batch switch @http", () => {
    test.describe.configure({ mode: "serial" });

    const studentId = SEED.users.STUDENT.id;
    const fromBatchId = SEED.kidsBatchId;

    async function restoreSeedKidsEnrollment(fromBatch?: string) {
      if (!fromBatch || fromBatch === fromBatchId) return;
      try {
        await expectOk("TRAINER", `/batches/${fromBatch}/switch`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            toBatchId: fromBatchId,
            includeAllPrices: true,
          }),
        });
      } catch {
        // Best-effort restore for later serial cases / other suites.
      }
    }

    test("trainer switches a student to another same-category batch @http", async () => {
      const cleanup = new TestDataCleanup();
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
            const toBatch = await expectOk<{ id: string }>(
              "STAFF",
              "/batches",
              {
                method: "POST",
                body: JSON.stringify({
                  studioId: SEED.users.STAFF.studioId,
                  name: `Switch To ${stamp}`,
                  category: "KIDS",
                  branchId: SEED.branchEastId,
                  trainerIds: [SEED.users.TRAINER_2.id],
                  danceCategories: [
                    { name: "Hip Hop", description: "Switch to" },
                  ],
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
              },
            );
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
          inactiveEnrollments: Array<{
            studentId: string;
            inactiveReason: string;
          }>;
        }>("TRAINER", `/batches/${fromBatchId}`);
        expect(
          fromDetail.enrollments.some((row) => row.studentId === studentId),
        ).toBe(false);
        expect(
          fromDetail.inactiveEnrollments.some(
            (row) =>
              row.studentId === studentId && row.inactiveReason === "MOVED",
          ),
        ).toBe(true);

        const toDetail = await expectOk<{
          enrollments: Array<{ studentId: string }>;
        }>("TRAINER", `/batches/${toBatchId}`);
        expect(
          toDetail.enrollments.some((row) => row.studentId === studentId),
        ).toBe(true);
      } finally {
        await restoreSeedKidsEnrollment(toBatchId);
        await cleanup.dispose();
      }
    });

    test("switch-targets default same-plan filter and includeAllPrices override @http", async () => {
      const cleanup = new TestDataCleanup();
      const stamp = Date.now();
      let toBatchId: string | undefined;
      let monthlyPlanId: string | undefined;
      let quarterlyPlanId: string | undefined;

      try {
        const monthly = await expectOk<{ id: string }>(
          "STAFF",
          "/subscriptions",
          {
            method: "POST",
            body: JSON.stringify({
              studioId: SEED.users.STAFF.studioId,
              name: `Premium Kid Monthly ${stamp}`,
              kind: "INDIVIDUAL",
              individualAudience: "KID",
              billingCadence: "MONTHLY",
              price: 9999,
              active: true,
            }),
          },
        );
        monthlyPlanId = monthly.id;

        const quarterly = await expectOk<{ id: string }>(
          "STAFF",
          "/subscriptions",
          {
            method: "POST",
            body: JSON.stringify({
              studioId: SEED.users.STAFF.studioId,
              name: `Premium Kid Quarterly ${stamp}`,
              kind: "INDIVIDUAL",
              individualAudience: "KID",
              billingCadence: "QUARTERLY",
              price: 24_999,
              active: true,
            }),
          },
        );
        quarterlyPlanId = quarterly.id;

        let lastError: unknown;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const hour = String(5 + ((stamp + attempt) % 8)).padStart(2, "0");
          const minute = String((stamp + attempt * 13) % 60).padStart(2, "0");
          const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
          const endHour = String(
            Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
          ).padStart(2, "0");
          try {
            const toBatch = await expectOk<{ id: string }>(
              "STAFF",
              "/batches",
              {
                method: "POST",
                body: JSON.stringify({
                  studioId: SEED.users.STAFF.studioId,
                  name: `Premium Switch ${stamp}-${attempt}`,
                  category: "KIDS",
                  branchId: SEED.branchEastId,
                  trainerIds: [SEED.users.TRAINER_2.id],
                  danceCategories: [
                    { name: "Hip Hop", description: "Different price switch" },
                  ],
                  scheduleJson: {
                    frequency: "WEEKLY",
                    weekdays: [(attempt + 3) % 7],
                    startDate: "2028-06-01",
                    endDate: "2028-09-30",
                    startTime: `${hour}:${minute}`,
                    endTime: `${endHour}:${endMinute}`,
                    utcOffsetMinutes: 0,
                  },
                  capacity: 8,
                  enrollmentMode: "STAFF_ONLY",
                  subscriptionIds: [monthlyPlanId, quarterlyPlanId],
                  active: true,
                  certificationEnabled: false,
                }),
              },
            );
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
            : new Error("Could not create different-price switch target");
        }

        const samePlanTargets = await expectOk<{
          targets: Array<{ id: string }>;
        }>(
          "TRAINER",
          `/batches/${fromBatchId}/switch-targets?studentId=${encodeURIComponent(studentId)}`,
        );
        expect(samePlanTargets.targets.some((t) => t.id === toBatchId)).toBe(
          false,
        );

        const allPriceTargets = await expectOk<{
          includeAllPrices: boolean;
          targets: Array<{ id: string; price: number | null }>;
        }>(
          "TRAINER",
          `/batches/${fromBatchId}/switch-targets?studentId=${encodeURIComponent(studentId)}&includeAllPrices=true`,
        );
        expect(allPriceTargets.includeAllPrices).toBe(true);
        expect(allPriceTargets.targets.some((t) => t.id === toBatchId)).toBe(
          true,
        );

        const denied = await expectStatus(
          "TRAINER",
          `/batches/${fromBatchId}/switch`,
          400,
          {
            method: "POST",
            body: JSON.stringify({
              studentId,
              toBatchId,
            }),
          },
        );
        expect(denied.text).toMatch(/subscription plan/i);

        const switched = await expectOk<{
          batchId: string;
          studentId: string;
        }>("TRAINER", `/batches/${fromBatchId}/switch`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            toBatchId,
            includeAllPrices: true,
          }),
        });
        expect(switched).toMatchObject({
          batchId: toBatchId,
          studentId,
        });
      } finally {
        await restoreSeedKidsEnrollment(toBatchId);
        await cleanup.dispose();
        for (const planId of [monthlyPlanId, quarterlyPlanId]) {
          if (!planId) continue;
          try {
            await fetch(`${apiBaseUrl()}/subscriptions/${planId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${bearerFor("STAFF")}`,
              },
            });
          } catch {
            // ignore cleanup failures
          }
        }
      }
    });
  });
});
