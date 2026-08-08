import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

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
    const result = await expectStatus(
      "PARENT",
      "/memberships/self/renew",
      400,
      {
        method: "POST",
        body: JSON.stringify({
          membershipId: SEED.membershipStudentId,
        }),
      },
    );
    expect(result.text).toMatch(/due or expired/i);
  });

  test("family-purchase is removed; family-combine creates combined invoice @http", async () => {
    await expectStatus("STAFF", "/memberships/family-purchase", 404, {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.studioId,
        subscriptionId: SEED.adultPlanIds[0],
        purchaserUserId: SEED.users.STUDENT.id,
        coveredStudents: [],
      }),
    });

    const depA = await expectOk<{ id: string }>(
      "STUDENT",
      "/users/me/family-members",
      {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP Combine A ${Date.now()}`,
          kind: "KID",
          gender: "FEMALE",
          ageRange: "UNDER_10",
        }),
      },
    );
    const depB = await expectOk<{ id: string }>(
      "STUDENT",
      "/users/me/family-members",
      {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP Combine B ${Date.now()}`,
          kind: "KID",
          gender: "FEMALE",
          ageRange: "UNDER_10",
        }),
      },
    );

    const invA = await expectOk<{ invoice: { id: string; amount: number } }>(
      "STAFF",
      `/batches/${SEED.kidsBatchId}/enroll`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: depA.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      },
    );
    const invB = await expectOk<{ invoice: { id: string; amount: number } }>(
      "STAFF",
      `/batches/${SEED.kidsBatchId}/enroll`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: depB.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      },
    );

    await expectStatus("STAFF", "/billing/family-combine", 400, {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.studioId,
        purchaserUserId: SEED.users.STUDENT.id,
        invoiceIds: [invA.invoice.id, invB.invoice.id],
        familyDiscount:
          Number(invA.invoice.amount) + Number(invB.invoice.amount) + 1,
      }),
    });

    const combined = await expectOk<{
      id: string;
      status: string;
      amount: number;
      familyDiscount: number;
      combineMeta: { sources: unknown[] } | null;
      kind: string;
    }>("STAFF", "/billing/family-combine", {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.studioId,
        purchaserUserId: SEED.users.STUDENT.id,
        invoiceIds: [invA.invoice.id, invB.invoice.id],
        familyDiscount: 100,
      }),
    });

    expect(combined.status).toBe("PENDING");
    expect(combined.kind).toBe("COMBINED");
    expect(Number(combined.familyDiscount)).toBe(100);
    expect(combined.combineMeta?.sources).toHaveLength(2);
    expect(Number(combined.amount)).toBe(
      Number(invA.invoice.amount) + Number(invB.invoice.amount) - 100,
    );
  });
});
