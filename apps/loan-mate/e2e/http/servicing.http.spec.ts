import { expect, test } from "@playwright/test";
import { activateLoan, draftLoan } from "./flows";
import {
  acme,
  errorMessage,
  expectOk,
  expectStatus,
  type LoanDetail,
  num,
  patch,
  post,
} from "./helpers";

test.describe("servicing @http", () => {
  test("an approved rate change rewrites unpaid installments and leaves the count intact @http", async () => {
    const { loan } = await activateLoan();
    const before = num(loan.annualRatePercent);
    const request = await expectOk<{ id: string; type: string }>(
      "manager",
      `/loans/${loan.id}/request-rate-change`,
      post({ annualRatePercent: 12, reason: "Retention" }),
    );
    expect(request.type).toBe("RATE_CHANGE");

    const self = await expectStatus(
      "manager",
      `/approvals/${request.id}/approve`,
      403,
      post({}),
    );
    expect(self.status).toBe(403);

    await expectOk("approver", `/approvals/${request.id}/approve`, post({}));
    const updated = await expectOk<LoanDetail>("officer", `/loans/${loan.id}`);
    expect(num(updated.annualRatePercent)).toBeCloseTo(12, 2);
    expect(updated.installments).toHaveLength(loan.installments.length);
    expect(num(updated.annualRatePercent)).not.toBeCloseTo(before, 2);
  });

  test("a rejected rate change leaves the booked rate in place @http", async () => {
    const { loan } = await activateLoan();
    const before = num(loan.annualRatePercent);
    const request = await expectOk<{ id: string }>(
      "owner",
      `/loans/${loan.id}/request-rate-change`,
      post({ annualRatePercent: 9, reason: "Too steep" }),
    );

    await expectStatus(
      "officer",
      `/approvals/${request.id}/reject`,
      403,
      post({ reason: "no" }),
    );
    const maker = await expectStatus(
      "owner",
      `/approvals/${request.id}/reject`,
      400,
      post({ reason: "withdraw" }),
    );
    expect(errorMessage(maker.data)).toContain("Maker cannot approve");

    const rejected = await expectOk<{ status: string }>(
      "approver",
      `/approvals/${request.id}/reject`,
      post({ reason: "Keep booked rate" }),
    );
    expect(rejected.status).toBe("REJECTED");

    const after = await expectOk<LoanDetail>("officer", `/loans/${loan.id}`);
    expect(num(after.annualRatePercent)).toBeCloseTo(before, 2);
    expect(after.installments).toHaveLength(loan.installments.length);

    const twice = await expectStatus(
      "approver",
      `/approvals/${request.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(twice.data)).toContain("already decided");
  });

  test("penalty override applies only after checker approval @http", async () => {
    const { loan } = await activateLoan();
    const request = await expectOk<{ id: string }>(
      "owner",
      `/loans/${loan.id}/request-penalty-override`,
      post({ penaltyDailyPercent: 0.05, reason: "Relief" }),
    );
    const denied = await expectStatus(
      "owner",
      `/approvals/${request.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(denied.data)).toContain("Maker cannot approve");

    await expectOk(
      "companyAdmin",
      `/approvals/${request.id}/approve`,
      post({}),
    );
    const updated = await expectOk<LoanDetail>("owner", `/loans/${loan.id}`);
    expect(num(updated.penaltyDailyPercent)).toBeCloseTo(0.05, 2);
  });

  test("restructure shortens remaining tenure, and the company cap blocks another @http", async () => {
    const { loan } = await activateLoan();
    const request = await expectOk<{ id: string; type: string }>(
      "officer",
      `/loans/${loan.id}/request-restructure`,
      post({
        newTenure: 8,
        newRate: 14,
        reason: "Hardship",
      }),
    );
    expect(request.type).toBe("RESTRUCTURE");
    await expectOk("approver", `/approvals/${request.id}/approve`, post({}));

    const updated = await expectOk<LoanDetail>("manager", `/loans/${loan.id}`);
    expect(updated.restructureCount).toBe(1);
    expect(updated.tenureInstallments).toBe(8);
    expect(num(updated.annualRatePercent)).toBeCloseTo(14, 2);
    expect(updated.installments).toHaveLength(8);
    expect(updated.status).toBe("ACTIVE");

    const { companyId } = await acme();
    await expectOk(
      "owner",
      `/companies/${companyId}/settings`,
      patch({ maxRestructures: 0 }),
    );
    try {
      const { loan: capped } = await activateLoan();
      const pending = await expectOk<{ id: string }>(
        "manager",
        `/loans/${capped.id}/request-restructure`,
        post({ newTenure: 6, newRate: 12, reason: "Over cap" }),
      );
      const blocked = await expectStatus(
        "approver",
        `/approvals/${pending.id}/approve`,
        400,
        post({}),
      );
      expect(errorMessage(blocked.data)).toContain("Maximum restructures");
      const unchanged = await expectOk<LoanDetail>(
        "officer",
        `/loans/${capped.id}`,
      );
      expect(unchanged.restructureCount).toBe(0);
    } finally {
      await expectOk(
        "owner",
        `/companies/${companyId}/settings`,
        patch({ maxRestructures: 3 }),
      );
    }
  });

  test("rate change and restructure are refused before the loan is active @http", async () => {
    const { loan } = await draftLoan();
    const rate = await expectStatus(
      "manager",
      `/loans/${loan.id}/request-rate-change`,
      400,
      post({ annualRatePercent: 10 }),
    );
    expect(errorMessage(rate.data)).toContain("after disbursement");

    await expectOk("officer", `/loans/${loan.id}/submit`, post({}));
    const restructure = await expectOk<{ id: string }>(
      "officer",
      `/loans/${loan.id}/request-restructure`,
      post({ newTenure: 6, newRate: 10 }),
    );
    const blocked = await expectStatus(
      "approver",
      `/approvals/${restructure.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(blocked.data)).toContain("ACTIVE");
  });
});
