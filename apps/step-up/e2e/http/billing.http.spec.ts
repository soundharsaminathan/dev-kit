import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

async function createPendingInvoice(amount = 2200) {
  return expectOk<{ id: string; status: string }>("STAFF", "/billing", {
    method: "POST",
    body: JSON.stringify({
      studioId: SEED.users.STAFF.studioId,
      studentId: SEED.users.STUDENT.id,
      amount,
    }),
  });
}

test.describe("billing HTTP @http", () => {
  test("staff marks unpaid invoice paid @http", async () => {
    const target = await createPendingInvoice();
    expect(target.status).toBe("PENDING");

    const paid = await expectOk<{ id: string; status: string }>(
      "STAFF",
      `/billing/${target.id}/paid`,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      },
    );
    expect(paid.status).toBe("PAID");
  });

  test("staff marks invoice paid with discounts @http", async () => {
    const target = await createPendingInvoice(2000);
    expect(target.status).toBe("PENDING");

    const paid = await expectOk<{
      id: string;
      status: string;
      amount: number;
      referralDiscount: number;
      studioDiscount: number;
      subtotal: number;
    }>("STAFF", `/billing/${target.id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({
        paymentMethod: "UPI_MANUAL",
        referralDiscount: 200,
        studioDiscount: 100,
      }),
    });
    expect(paid.status).toBe("PAID");
    expect(paid.subtotal).toBe(2000);
    expect(paid.referralDiscount).toBe(200);
    expect(paid.studioDiscount).toBe(100);
    expect(paid.amount).toBe(1700);
  });

  test("trainer cannot mark invoice paid @http", async () => {
    const target = await createPendingInvoice(1800);
    await expectStatus("TRAINER", `/billing/${target.id}/paid`, 403, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });
  });

  test("student lists own invoices @http", async () => {
    const invoices = await expectOk<Array<{ id: string }>>(
      "STUDENT",
      `/billing/student/${SEED.users.STUDENT.id}`,
    );
    expect(Array.isArray(invoices)).toBe(true);
  });
});
