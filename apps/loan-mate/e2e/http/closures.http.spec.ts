import { expect, test } from "@playwright/test";
import { activateLoan, draftLoan } from "./flows";
import {
  errorMessage,
  expectOk,
  expectStatus,
  type LoanDetail,
  loanOutstanding,
  num,
  post,
} from "./helpers";

test.describe("closures @http", () => {
  test("foreclosure quote is approved into a closed loan @http", async () => {
    const { loan } = await activateLoan();
    const quote = await expectOk<{
      loanId: string;
      principalOutstanding: number;
      totalDue: number;
      foreclosureCharge: number;
    }>("officer", `/loans/${loan.id}/foreclosure-quote?asOfDate=2027-08-01`);
    expect(quote.loanId).toBe(loan.id);
    expect(quote.principalOutstanding).toBeGreaterThan(0);
    expect(quote.totalDue).toBeGreaterThan(quote.principalOutstanding);

    await expectStatus(
      "collector",
      `/loans/${loan.id}/request-foreclosure`,
      403,
      post({ asOfDate: "2027-08-01", reason: "Customer request" }),
    );

    const request = await expectOk<{ id: string; type: string }>(
      "officer",
      `/loans/${loan.id}/request-foreclosure`,
      post({ asOfDate: "2027-08-01", reason: "Customer request" }),
    );
    expect(request.type).toBe("FORECLOSURE");
    await expectOk("approver", `/approvals/${request.id}/approve`, post({}));

    const closed = await expectOk<LoanDetail>("owner", `/loans/${loan.id}`);
    expect(closed.status).toBe("CLOSED");
    expect(closed.closureType).toBe("FORECLOSED");

    const register = await expectOk<
      Array<{ loanNumber: string; type: string }>
    >("owner", "/reports/closures");
    expect(
      register.some(
        (row) =>
          row.loanNumber === loan.loanNumber && row.type === "FORECLOSED",
      ),
    ).toBeTruthy();
  });

  test("settlement closes the loan at a negotiated amount @http", async () => {
    const { loan } = await activateLoan();
    const missing = await expectOk<{ id: string }>(
      "manager",
      `/loans/${loan.id}/request-settlement`,
      post({ reason: "No amount" }),
    );
    const rejected = await expectStatus(
      "approver",
      `/approvals/${missing.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(rejected.data)).toContain("settlementAmount");
    const stillActive = await expectOk<{ status: string }>(
      "officer",
      `/loans/${loan.id}`,
    );
    expect(stillActive.status).toBe("ACTIVE");

    const request = await expectOk<{ id: string; type: string }>(
      "manager",
      `/loans/${loan.id}/request-settlement`,
      post({
        settlementAmount: 1000,
        asOfDate: "2027-08-01",
        reason: "One-time settlement",
      }),
    );
    expect(request.type).toBe("SETTLEMENT");
    await expectOk(
      "companyAdmin",
      `/approvals/${request.id}/approve`,
      post({}),
    );

    const closed = await expectOk<LoanDetail>("officer", `/loans/${loan.id}`);
    expect(closed.status).toBe("CLOSED");
    expect(closed.closureType).toBe("SETTLED");
  });

  test("write-off keeps the loan collectible for recovery @http", async () => {
    const { loan } = await activateLoan();
    await expectStatus(
      "officer",
      `/loans/${loan.id}/request-write-off`,
      403,
      post({ reason: "Uncollectable" }),
    );

    const request = await expectOk<{ id: string }>(
      "manager",
      `/loans/${loan.id}/request-write-off`,
      post({ asOfDate: "2027-08-01", reason: "Uncollectable" }),
    );
    await expectOk("approver", `/approvals/${request.id}/approve`, post({}));

    const writtenOff = await expectOk<LoanDetail>(
      "collector",
      `/loans/${loan.id}`,
    );
    expect(writtenOff.status).toBe("WRITTEN_OFF");
    expect(loanOutstanding(writtenOff)).toBe(0);

    const plain = await expectStatus(
      "collector",
      "/payments",
      400,
      post({
        loanId: loan.id,
        amount: 500,
        paymentDate: "2027-08-15",
        mode: "BANK_TRANSFER",
      }),
    );
    expect(errorMessage(plain.data)).toContain("Overpayment");

    const recovery = await expectOk<{ treatment: string }>(
      "collector",
      "/payments",
      post({
        loanId: loan.id,
        amount: 500,
        paymentDate: "2027-08-15",
        mode: "BANK_TRANSFER",
        reference: "RECOVERY-1",
        advanceTreatment: "PARK_AS_ADVANCE",
      }),
    );
    expect(recovery.treatment).toBe("PARK_AS_ADVANCE");
    const after = await expectOk<LoanDetail>("owner", `/loans/${loan.id}`);
    expect(num(after.advanceBalance)).toBeCloseTo(500, 2);
    expect(after.status).toBe("WRITTEN_OFF");
  });

  test("foreclosure approval does not close a loan that was never disbursed @http", async () => {
    const { loan } = await draftLoan();
    const quote = await expectOk<{ principalOutstanding: number }>(
      "officer",
      `/loans/${loan.id}/foreclosure-quote`,
    );
    expect(quote.principalOutstanding).toBe(0);

    const request = await expectOk<{ id: string }>(
      "officer",
      `/loans/${loan.id}/request-foreclosure`,
      post({ reason: "Too early" }),
    );
    const blocked = await expectStatus(
      "approver",
      `/approvals/${request.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(blocked.data)).toContain("Loan not active");

    const stillDraft = await expectOk<{ status: string }>(
      "officer",
      `/loans/${loan.id}`,
    );
    expect(stillDraft.status).toBe("DRAFT");
  });
});
