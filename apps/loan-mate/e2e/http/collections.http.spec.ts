import { expect, test } from "@playwright/test";
import { activateLoan, draftLoan, FUTURE_DISBURSEMENT } from "./flows";
import {
  errorMessage,
  expectOk,
  expectStatus,
  installmentRemaining,
  type LoanDetail,
  loanOutstanding,
  num,
  type Payment,
  post,
} from "./helpers";

test.describe("collections @http", () => {
  test("collector records an EMI and the receipt is listed on the loan @http", async () => {
    const { loan } = await activateLoan();
    const first = loan.installments[0]!;
    const emi = installmentRemaining(first);

    const payment = await expectOk<Payment>(
      "collector",
      "/payments",
      post({
        loanId: loan.id,
        amount: emi,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "UPI",
        reference: "UPI-EMI-1",
        details: "First installment",
      }),
    );
    expect(payment.receiptNumber.startsWith("RCPT-")).toBeTruthy();
    expect(num(payment.amount)).toBeCloseTo(emi, 2);

    const rows = await expectOk<Payment[]>(
      "officer",
      `/payments/loan/${loan.id}`,
    );
    expect(rows.some((row) => row.id === payment.id)).toBeTruthy();

    const after = await expectOk<LoanDetail>("collector", `/loans/${loan.id}`);
    const paid = after.installments.find((row) => row.id === first.id)!;
    expect(installmentRemaining(paid)).toBe(0);
    expect(paid.status).toBe("PAID");

    await expectStatus(
      "officer",
      "/payments",
      403,
      post({
        loanId: loan.id,
        amount: 10,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "CASH",
      }),
    );
  });

  test("overpayment is rejected until an advance treatment is chosen @http", async () => {
    const { loan } = await activateLoan();
    const outstanding = loanOutstanding(loan);
    const tooMuch = roundAmount(outstanding + 250);

    const rejected = await expectStatus(
      "collector",
      "/payments",
      400,
      post({
        loanId: loan.id,
        amount: tooMuch,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "NEFT",
      }),
    );
    expect(errorMessage(rejected.data)).toContain("Overpayment");

    const parked = await expectOk<{
      treatment: string;
      advancePayment: { advanceTreatment: string };
    }>(
      "manager",
      "/payments",
      post({
        loanId: loan.id,
        amount: tooMuch,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "NEFT",
        reference: "ADV-1",
        advanceTreatment: "PARK_AS_ADVANCE",
      }),
    );
    expect(parked.treatment).toBe("PARK_AS_ADVANCE");

    const after = await expectOk<LoanDetail>("owner", `/loans/${loan.id}`);
    expect(num(after.advanceBalance)).toBeCloseTo(250, 2);
    expect(loanOutstanding(after)).toBe(0);
  });

  test("a draft loan is not collectible @http", async () => {
    const { loan } = await draftLoan();
    const denied = await expectStatus(
      "collector",
      "/payments",
      400,
      post({
        loanId: loan.id,
        amount: 100,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "CASH",
      }),
    );
    expect(errorMessage(denied.data)).toContain("not collectible");
  });

  test("reversal is maker-checker and restores the installment @http", async () => {
    const { loan } = await activateLoan();
    const first = loan.installments[0]!;
    const emi = installmentRemaining(first);
    const payment = await expectOk<Payment>(
      "collector",
      "/payments",
      post({
        loanId: loan.id,
        amount: emi,
        paymentDate: FUTURE_DISBURSEMENT,
        mode: "CASH",
      }),
    );

    const direct = await expectStatus(
      "approver",
      `/payments/${payment.id}/reverse`,
      400,
      post({}),
    );
    expect(errorMessage(direct.data)).toContain("Approved reversal");

    const request = await expectOk<{ id: string }>(
      "collector",
      `/payments/${payment.id}/request-reversal`,
      post({ reason: "Wrong loan" }),
    );
    const self = await expectStatus(
      "collector",
      `/approvals/${request.id}/approve`,
      403,
      post({}),
    );
    expect(self.status).toBe(403);

    await expectOk("approver", `/approvals/${request.id}/approve`, post({}));
    const rows = await expectOk<Payment[]>(
      "owner",
      `/payments/loan/${loan.id}`,
    );
    expect(rows.find((row) => row.id === payment.id)?.reversed).toBe(true);

    const restored = await expectOk<LoanDetail>("officer", `/loans/${loan.id}`);
    const installment = restored.installments.find(
      (row) => row.id === first.id,
    )!;
    expect(installmentRemaining(installment)).toBeCloseTo(emi, 2);

    const twice = await expectStatus(
      "owner",
      `/payments/${payment.id}/reverse`,
      400,
      post({}),
    );
    expect(errorMessage(twice.data)).toMatch(/reversed|Approved reversal/);
  });

  test("interest waiver and overdue penalty waiver both need a checker @http", async () => {
    const fresh = await activateLoan();
    const target = fresh.loan.installments[0]!;
    const beforeInterest = num(target.interestDue);
    expect(beforeInterest).toBeGreaterThan(1);

    const interest = await expectOk<{ id: string }>(
      "collector",
      "/payments/interest-waiver/request",
      post({
        installmentId: target.id,
        amount: 1,
        reason: "Goodwill",
      }),
    );
    const tooBig = await expectStatus(
      "collector",
      "/payments/interest-waiver/request",
      400,
      post({
        installmentId: target.id,
        amount: beforeInterest + 10_000,
      }),
    );
    expect(errorMessage(tooBig.data)).toContain("unpaid interest");

    await expectOk("approver", `/approvals/${interest.id}/approve`, post({}));
    const waived = await expectOk<LoanDetail>(
      "owner",
      `/loans/${fresh.loan.id}`,
    );
    const afterInterest = waived.installments.find(
      (row) => row.id === target.id,
    )!;
    expect(num(afterInterest.interestDue)).toBeCloseTo(beforeInterest - 1, 2);

    const overdue = await activateLoan({ disbursementDate: "2025-01-15" });
    const overdueFirst = overdue.loan.installments[0]!;
    await expectOk(
      "collector",
      "/payments",
      post({
        loanId: overdue.loan.id,
        amount: 1,
        paymentDate: "2026-09-22",
        mode: "CASH",
        reference: "accrue-penalty",
      }),
    );
    const accrued = await expectOk<LoanDetail>(
      "collector",
      `/loans/${overdue.loan.id}`,
    );
    const penal = accrued.installments.find(
      (row) => row.id === overdueFirst.id,
    )!;
    expect(num(penal.penaltyDue)).toBeGreaterThan(1);

    const noPenalty = await expectStatus(
      "collector",
      "/payments/waiver/request",
      400,
      post({ installmentId: target.id, amount: 1 }),
    );
    expect(errorMessage(noPenalty.data)).toContain("unpaid penalty");

    const penalty = await expectOk<{ id: string }>(
      "collector",
      "/payments/waiver/request",
      post({
        installmentId: penal.id,
        amount: 1,
        reason: "Penalty relief",
      }),
    );
    const unapproved = await expectStatus(
      "approver",
      "/payments/waiver/execute",
      400,
      post({ installmentId: target.id, amount: 1 }),
    );
    expect(errorMessage(unapproved.data)).toContain("Approved waiver");

    await expectOk("approver", `/approvals/${penalty.id}/approve`, post({}));
    const relieved = await expectOk<LoanDetail>(
      "owner",
      `/loans/${overdue.loan.id}`,
    );
    const afterPenalty = relieved.installments.find(
      (row) => row.id === penal.id,
    )!;
    expect(num(afterPenalty.penaltyDue)).toBeCloseTo(
      num(penal.penaltyDue) - 1,
      2,
    );
  });
});

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}
