import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

type StudioInvoice = {
  id: string;
  status: string;
  plan: string;
  amountDue: number;
  discount: number;
  month: string;
};

test.describe("studio plan invoices HTTP @http", () => {
  test("owner cannot create plan invoices @http", async () => {
    await expectStatus(
      "OWNER",
      `/studios/${SEED.studioId}/studio-invoices`,
      403,
      {
        method: "POST",
        body: JSON.stringify({ month: "2026-08", plan: "BASIC" }),
      },
    );
  });

  test("system admin drafts, publishes, and marks paid @http", async () => {
    const month = "2099-01";

    const draft = await expectOk<StudioInvoice>(
      "SYSTEM_ADMIN",
      `/studios/${SEED.studioId}/studio-invoices`,
      {
        method: "POST",
        body: JSON.stringify({
          month,
          plan: "BASIC",
          discount: 99,
          notes: "http test draft",
        }),
      },
    );
    expect(draft.status).toBe("DRAFT");
    expect(draft.amountDue).toBe(900);
    expect(draft.month).toBe(month);

    const published = await expectOk<StudioInvoice>(
      "SYSTEM_ADMIN",
      `/studio-invoices/${draft.id}/publish`,
      { method: "POST", body: "{}" },
    );
    expect(published.status).toBe("PENDING");

    const ownerList = await expectOk<StudioInvoice[]>(
      "OWNER",
      `/studios/${SEED.studioId}/studio-invoices`,
    );
    expect(ownerList.some((row) => row.id === draft.id)).toBe(true);
    expect(
      ownerList.every(
        (row) => row.status === "PENDING" || row.status === "PAID",
      ),
    ).toBe(true);

    const paid = await expectOk<StudioInvoice>(
      "SYSTEM_ADMIN",
      `/studio-invoices/${draft.id}/paid`,
      {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "UPI_MANUAL" }),
      },
    );
    expect(paid.status).toBe("PAID");

    // Cleanup: void is not allowed after paid, leave PAID row (harmless in seed DB).
    // Create a throwaway draft and void it to cover void path.
    const toVoid = await expectOk<StudioInvoice>(
      "SYSTEM_ADMIN",
      `/studios/${SEED.studioId}/studio-invoices`,
      {
        method: "POST",
        body: JSON.stringify({ month: "2099-02", plan: "ADVANCED" }),
      },
    );
    const voided = await expectOk<StudioInvoice>(
      "SYSTEM_ADMIN",
      `/studio-invoices/${toVoid.id}/void`,
      { method: "POST", body: "{}" },
    );
    expect(voided.status).toBe("VOID");
  });

  test("usage endpoint returns counts for admin and owner @http", async () => {
    const adminUsage = await expectOk<{
      activeStudents: number;
      trainers: number;
      sessionsThisMonth: number;
      suggestedPlan: string;
    }>("SYSTEM_ADMIN", `/studios/${SEED.studioId}/usage`);
    expect(adminUsage.activeStudents).toBeGreaterThanOrEqual(0);
    expect(["BASIC", "ADVANCED"]).toContain(adminUsage.suggestedPlan);

    const ownerUsage = await expectOk<{ activeStudents: number }>(
      "OWNER",
      `/studios/${SEED.studioId}/usage`,
    );
    expect(ownerUsage.activeStudents).toBe(adminUsage.activeStudents);
  });
});
