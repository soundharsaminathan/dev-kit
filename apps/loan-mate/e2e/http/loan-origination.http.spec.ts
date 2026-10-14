import { expect, test } from "@playwright/test";
import { activateLoan, draftLoan, FUTURE_DISBURSEMENT } from "./flows";
import {
  acme,
  createCustomer,
  errorMessage,
  expectOk,
  expectStatus,
  num,
  post,
} from "./helpers";

test.describe("loan origination @http", () => {
  test("draft moves through verify, maker-checker, and disbursement onto an EMI schedule @http", async () => {
    const { loan } = await activateLoan();
    expect(loan.loanNumber.startsWith("LN-acme-")).toBeTruthy();
    expect(loan.tenureInstallments).toBe(12);
    expect(loan.frequency).toBe("MONTHLY");
    expect(loan.installments).toHaveLength(12);
    expect(loan.installments[0]?.number).toBe(1);
    expect(num(loan.netDisbursement)).toBeLessThan(num(loan.principal));
    expect(loan.dpd).toBe(0);

    const listed = await expectOk<Array<{ id: string }>>("approver", "/loans");
    expect(listed.some((row) => row.id === loan.id)).toBeTruthy();

    const journals = await expectOk<
      Array<{ sourceType: string; sourceId: string | null; lines: unknown[] }>
    >("owner", "/accounting/journals");
    const entry = journals.find(
      (row) => row.sourceType === "DISBURSEMENT" && row.sourceId === loan.id,
    );
    expect(entry?.lines.length).toBeGreaterThan(0);

    const audit = await expectOk<Array<{ action: string }>>(
      "owner",
      `/audit?entityType=Loan&entityId=${loan.id}`,
    );
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining(["loan.create", "loan.submit", "loan.disburse"]),
    );
  });

  test("weekly terms and a first-EMI option disburse without a product override @http", async () => {
    const weekly = await activateLoan({ frequency: "WEEKLY" });
    expect(weekly.loan.frequency).toBe("WEEKLY");
    expect(weekly.loan.productOverride).toBe(false);
    expect(weekly.loan.installments).toHaveLength(12);

    const shifted = await activateLoan({
      monthlyFirstEmiOption: "CONVERT_TO_1ST_NEXT_MONTH",
    });
    expect(shifted.loan.status).toBe("ACTIVE");
    expect(shifted.loan.productOverride).toBe(false);
  });

  test("biweekly and partial-interest first EMI use the product terms @http", async () => {
    const biweekly = await activateLoan({ frequency: "BIWEEKLY" });
    expect(biweekly.loan.frequency).toBe("BIWEEKLY");
    expect(biweekly.loan.productOverride).toBe(false);
    expect(num(biweekly.loan.annualRatePercent)).toBeCloseTo(17, 2);
    expect(biweekly.loan.installments).toHaveLength(12);

    const exact = await activateLoan({ monthlyFirstEmiOption: "EXACT_DAY" });
    const partial = await activateLoan({
      monthlyFirstEmiOption: "CONVERT_TO_1ST_PARTIAL",
    });
    expect(partial.loan.productOverride).toBe(false);
    expect(num(partial.loan.netDisbursement)).toBeLessThan(
      num(exact.loan.netDisbursement),
    );
    expect(num(partial.loan.netDisbursement)).toBeLessThan(
      num(partial.loan.principal),
    );
  });

  test("a rejected loan approval stays verified until a later checker approves @http", async () => {
    const { loan } = await draftLoan();
    await expectOk("officer", `/loans/${loan.id}/submit`, post({}));
    await expectOk("manager", `/loans/${loan.id}/verify`, post({}));
    const approval = await expectOk<{ id: string }>(
      "officer",
      `/loans/${loan.id}/request-approval`,
      post({}),
    );

    await expectStatus(
      "officer",
      `/approvals/${approval.id}/reject`,
      403,
      post({ reason: "Not my queue" }),
    );
    const own = await expectStatus(
      "officer",
      `/approvals/${approval.id}/approve`,
      403,
      post({}),
    );
    expect(own.status).toBe(403);

    const rejected = await expectOk<{ status: string }>(
      "approver",
      `/approvals/${approval.id}/reject`,
      post({ reason: "Income docs incomplete" }),
    );
    expect(rejected.status).toBe("REJECTED");

    const stillVerified = await expectOk<{ status: string }>(
      "officer",
      `/loans/${loan.id}`,
    );
    expect(stillVerified.status).toBe("VERIFIED");
    const disburse = await expectStatus(
      "manager",
      `/loans/${loan.id}/disburse`,
      400,
      post({ disbursementDate: FUTURE_DISBURSEMENT, mode: "CASH" }),
    );
    expect(errorMessage(disburse.data)).toContain("APPROVED");

    const again = await expectStatus(
      "approver",
      `/approvals/${approval.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(again.data)).toContain("already decided");

    const retry = await expectOk<{ id: string }>(
      "officer",
      `/loans/${loan.id}/request-approval`,
      post({}),
    );
    await expectOk("approver", `/approvals/${retry.id}/approve`, post({}));
    const approved = await expectOk<{ status: string }>(
      "manager",
      `/loans/${loan.id}`,
    );
    expect(approved.status).toBe("APPROVED");
  });

  test("product override must be approved before the loan can be approved @http", async () => {
    const catalog = await acme();
    const customer = await createCustomer();
    const draft = await expectOk<{ id: string; productOverride: boolean }>(
      "officer",
      "/loans",
      post({
        customerId: customer.id,
        productId: catalog.productId,
        branchId: catalog.branchId,
        principal: 80000,
        tenureInstallments: 9,
      }),
    );
    expect(draft.productOverride).toBe(true);

    await expectOk("officer", `/loans/${draft.id}/submit`, post({}));
    await expectOk("manager", `/loans/${draft.id}/verify`, post({}));
    const blocked = await expectStatus(
      "officer",
      `/loans/${draft.id}/request-approval`,
      400,
      post({}),
    );
    expect(errorMessage(blocked.data)).toContain("Product override");

    const pending = await expectOk<
      Array<{ id: string; type: string; entityId: string }>
    >("approver", "/approvals/pending");
    const override = pending.find(
      (row) => row.type === "PRODUCT_OVERRIDE" && row.entityId === draft.id,
    );
    expect(override).toBeTruthy();
    await expectOk("approver", `/approvals/${override!.id}/approve`, post({}));

    const approval = await expectOk<{ id: string }>(
      "officer",
      `/loans/${draft.id}/request-approval`,
      post({}),
    );
    await expectOk("approver", `/loans/${draft.id}/approve`, post({}));
    const approved = await expectOk<{ status: string }>(
      "officer",
      `/loans/${draft.id}`,
    );
    expect(approved.status).toBe("APPROVED");
    expect(approval.id).toBeTruthy();
  });

  test("maker cannot approve their own loan, and a different checker can @http", async () => {
    const catalog = await acme();
    const customer = await createCustomer();
    const draft = await expectOk<{ id: string }>(
      "owner",
      "/loans",
      post({
        customerId: customer.id,
        productId: catalog.productId,
        branchId: catalog.branchId,
      }),
    );
    await expectOk("owner", `/loans/${draft.id}/submit`, post({}));
    await expectOk("owner", `/loans/${draft.id}/verify`, post({}));
    const approval = await expectOk<{ id: string; makerId: string }>(
      "owner",
      `/loans/${draft.id}/request-approval`,
      post({}),
    );
    const denied = await expectStatus(
      "owner",
      `/approvals/${approval.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(denied.data)).toContain("Maker cannot approve");

    await expectOk("approver", `/approvals/${approval.id}/approve`, post({}));
    const loan = await expectOk<{ status: string }>(
      "owner",
      `/loans/${draft.id}`,
    );
    expect(loan.status).toBe("APPROVED");
  });

  test("verifier rejects a submitted loan and disbursement stays closed @http", async () => {
    const { loan } = await draftLoan();
    await expectOk("officer", `/loans/${loan.id}/submit`, post({}));
    const rejected = await expectOk<{
      status: string;
      rejectionReason: string;
    }>(
      "approver",
      `/loans/${loan.id}/reject`,
      post({ reason: "Incomplete income proof" }),
    );
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Incomplete income proof");

    const again = await expectStatus(
      "manager",
      `/loans/${loan.id}/disburse`,
      400,
      post({ disbursementDate: FUTURE_DISBURSEMENT, mode: "CASH" }),
    );
    expect(errorMessage(again.data)).toContain("APPROVED");

    await expectStatus("officer", `/loans/${loan.id}/submit`, 400, post({}));
  });

  test("verify requires PAN, address, and a KYC document @http", async () => {
    const missingKyc = await draftLoan({ kyc: false });
    await expectOk("officer", `/loans/${missingKyc.loan.id}/submit`, post({}));
    const noDoc = await expectStatus(
      "manager",
      `/loans/${missingKyc.loan.id}/verify`,
      400,
      post({}),
    );
    expect(errorMessage(noDoc.data)).toContain("KYC");

    const noAddress = await draftLoan({ address: null, kyc: true });
    await expectOk("officer", `/loans/${noAddress.loan.id}/submit`, post({}));
    const noAddr = await expectStatus(
      "manager",
      `/loans/${noAddress.loan.id}/verify`,
      400,
      post({}),
    );
    expect(errorMessage(noAddr.data)).toContain("address");

    const stripped = await createCustomer();
    const catalog = await acme();
    const loan = await expectOk<{ id: string }>(
      "officer",
      "/loans",
      post({
        customerId: stripped.id,
        productId: catalog.productId,
        branchId: catalog.branchId,
      }),
    );
    await expectOk("officer", `/loans/${loan.id}/submit`, post({}));
    await expectOk("officer", `/customers/${stripped.id}`, {
      method: "PATCH",
      body: JSON.stringify({ pan: " " }),
    });
    const noPan = await expectStatus(
      "manager",
      `/loans/${loan.id}/verify`,
      400,
      post({}),
    );
    expect(errorMessage(noPan.data)).toContain("PAN");
  });

  test("branch roles cannot skip ahead or act outside their step @http", async () => {
    const { loan } = await draftLoan();
    await expectStatus("officer", `/loans/${loan.id}/verify`, 403, post({}));
    await expectStatus(
      "officer",
      `/loans/${loan.id}/disburse`,
      403,
      post({ disbursementDate: FUTURE_DISBURSEMENT }),
    );
    await expectStatus(
      "approver",
      "/loans",
      403,
      post({
        customerId: loan.customerId,
        productId: (await acme()).productId,
        branchId: loan.branchId,
      }),
    );
    await expectStatus("collector", `/loans/${loan.id}/submit`, 403, post({}));

    const early = await expectStatus(
      "manager",
      `/loans/${loan.id}/disburse`,
      400,
      post({ disbursementDate: FUTURE_DISBURSEMENT, mode: "CASH" }),
    );
    expect(errorMessage(early.data)).toContain("APPROVED");

    const active = await activateLoan();
    const rateTooSoon = await draftLoan();
    const denied = await expectStatus(
      "manager",
      `/loans/${rateTooSoon.loan.id}/request-rate-change`,
      400,
      post({ annualRatePercent: 12, reason: "too early" }),
    );
    expect(errorMessage(denied.data)).toContain("after disbursement");
    expect(active.loan.status).toBe("ACTIVE");
  });
});
