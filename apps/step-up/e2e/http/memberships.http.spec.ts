import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

test.describe("memberships HTTP @http", () => {
  test("removed no-invoice shortcuts return 404 @http", async () => {
    await expectStatus("STAFF", "/memberships/assign", 404, {
      method: "POST",
      body: JSON.stringify({
        subscriptionId: SEED.adultPlanIds[0],
        purchaserUserId: SEED.users.STUDENT.id,
        coveredStudents: [
          { studentId: SEED.users.STUDENT.id, seatRole: "ADULT" },
        ],
      }),
    });
    await expectStatus("STUDENT", "/memberships/self/assign", 404, {
      method: "POST",
      body: JSON.stringify({
        subscriptionId: SEED.adultPlanIds[0],
        purchaserUserId: SEED.users.STUDENT.id,
        coveredStudents: [
          { studentId: SEED.users.STUDENT.id, seatRole: "ADULT" },
        ],
      }),
    });
    await expectStatus("STAFF", "/memberships/renew", 404, {
      method: "POST",
      body: JSON.stringify({
        membershipId: SEED.membershipStudentDueId,
      }),
    });
  });

  test("self/renew returns existing pending renewal invoice @http", async () => {
    const invoice = await expectOk<{
      id: string;
      status: string;
      membershipId: string;
      amount: number;
    }>("STUDENT", "/memberships/self/renew", {
      method: "POST",
      body: JSON.stringify({
        membershipId: SEED.membershipStudentDueId,
      }),
    });

    expect(invoice.status).toBe("PENDING");
    expect(invoice.membershipId).toBe(SEED.membershipStudentDueId);
    expect(Number(invoice.amount)).toBe(3500);
    expect(invoice.id).toBe(SEED.invoiceRenewalPendingId);

    const memberships = await expectOk<Array<{ id: string; status: string }>>(
      "STUDENT",
      `/memberships/student/${SEED.users.STUDENT.id}`,
    );
    const due = memberships.find((m) => m.id === SEED.membershipStudentDueId);
    expect(due?.status).toBe("DUE");
  });

  test("self/renew rejects ACTIVE memberships @http", async () => {
    const result = await expectStatus("STUDENT", "/memberships/self/renew", 400, {
      method: "POST",
      body: JSON.stringify({
        membershipId: SEED.membershipStudentId,
      }),
    });
    expect(result.text).toMatch(/due or expired/i);
  });

  test("family-purchase creates pending invoice with purchaseMeta @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const adult = await createHttpStudent("Family Adult", cleanup);
      const kid = await createHttpStudent("Family Kid", cleanup);

      const familyPlan = await expectOk<{
        id: string;
        price: number;
      }>("STAFF", "/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.studioId,
          name: `HTTP Family Duo ${Date.now()}`,
          kind: "FAMILY",
          familyPack: "ONE_ADULT_ONE_KID",
          billingCadence: "MONTHLY",
          price: 5000,
          active: true,
        }),
      });

      const invoice = await expectOk<{
        id: string;
        status: string;
        membershipId: string | null;
        amount: number;
        purchaseMeta: unknown;
      }>("STAFF", "/memberships/family-purchase", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.studioId,
          subscriptionId: familyPlan.id,
          purchaserUserId: adult.id,
          coveredStudents: [
            {
              studentId: adult.id,
              seatRole: "ADULT",
              batchId: SEED.beginnerBatchId,
            },
            {
              studentId: kid.id,
              seatRole: "KID",
              batchId: SEED.kidsBatchId,
            },
          ],
        }),
      });

      expect(invoice.status).toBe("PENDING");
      expect(invoice.membershipId).toBeNull();
      expect(invoice.purchaseMeta).toBeTruthy();
      expect(Number(invoice.amount)).toBe(5000);
    } finally {
      await cleanup.dispose();
    }
  });
});
