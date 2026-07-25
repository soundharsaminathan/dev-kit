import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("billing HTTP @http", () => {
  test("staff marks unpaid invoice paid @http", async () => {
    const invoices = await expectOk<Array<{ id: string; status: string }>>(
      "STAFF",
      `/billing/studio/${SEED.users.STAFF.studioId}`,
    );

    const target = invoices.find(
      (invoice) => invoice.id === SEED.unpaidInvoiceHttpId,
    );

    test.skip(!target, "HTTP unpaid invoice missing — re-seed");
    test.skip(
      target!.status === "PAID",
      "HTTP unpaid invoice already paid — re-seed to reset",
    );

    const paid = await expectOk<{ id: string; status: string }>(
      "STAFF",
      `/billing/${target!.id}/paid`,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      },
    );
    expect(paid.status).toBe("PAID");
  });

  test("trainer cannot mark invoice paid @http", async () => {
    await expectStatus(
      "TRAINER",
      `/billing/${SEED.unpaidInvoiceHttpId}/paid`,
      403,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      },
    );
  });

  test("student lists own invoices @http", async () => {
    const invoices = await expectOk<Array<{ id: string }>>(
      "STUDENT",
      `/billing/student/${SEED.users.STUDENT.id}`,
    );
    expect(Array.isArray(invoices)).toBe(true);
  });
});
