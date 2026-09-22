import { expect, test } from "@playwright/test";
import { activateLoan } from "./flows";
import { expectOk, expectStatus } from "./helpers";

test.describe("reports, audit, and accounting @http", () => {
  test("portfolio, collections, and registers follow a disbursed loan @http", async () => {
    const { loan } = await activateLoan();

    const portfolio = await expectOk<
      Array<{ status: string; loanCount: number; productCode: string }>
    >("officer", "/reports/portfolio");
    expect(
      portfolio.some(
        (row) =>
          row.status === "ACTIVE" &&
          row.productCode === "PL-STD" &&
          row.loanCount > 0,
      ),
    ).toBeTruthy();

    const csv = await expectOk<string>(
      "owner",
      "/reports/portfolio?format=csv",
    );
    expect(csv).toContain("branchCode");
    expect(csv).toContain("PL-STD");

    await expectStatus("owner", "/reports/collections", 400);
    const collections = await expectOk<unknown[]>(
      "manager",
      "/reports/collections?from=2027-01-01&to=2027-12-31",
    );
    expect(Array.isArray(collections)).toBeTruthy();

    const overdue = await expectOk<unknown[]>("officer", "/reports/overdue");
    const npa = await expectOk<unknown[]>("officer", "/reports/npa");
    const disbursements = await expectOk<Array<{ loanNumber: string }>>(
      "officer",
      "/reports/disbursements?from=2027-06-01&to=2027-06-30",
    );
    const receipts = await expectOk<unknown[]>(
      "officer",
      "/reports/receipts?from=2027-01-01&to=2027-12-31",
    );
    expect(Array.isArray(overdue)).toBeTruthy();
    expect(Array.isArray(npa)).toBeTruthy();
    expect(Array.isArray(receipts)).toBeTruthy();
    expect(
      disbursements.some((row) => row.loanNumber === loan.loanNumber),
    ).toBeTruthy();

    await expectStatus("officer", "/reports/approvals", 403);
    const approvals = await expectOk<unknown[]>(
      "approver",
      "/reports/approvals",
    );
    expect(Array.isArray(approvals)).toBeTruthy();
  });

  test("audit viewer filters a loan and exports csv @http", async () => {
    const { loan } = await activateLoan();
    await expectStatus("officer", "/audit", 403);
    await expectStatus("collector", "/audit/export", 403);

    const rows = await expectOk<Array<{ action: string; entityId: string }>>(
      "manager",
      `/audit?entityType=Loan&entityId=${loan.id}&action=loan.disburse`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.entityId).toBe(loan.id);

    const badFormat = await expectStatus(
      "owner",
      `/audit/export?format=json&entityId=${loan.id}`,
      400,
    );
    expect(String(badFormat.data)).toContain("csv");

    const csv = await expectOk<string>(
      "owner",
      `/audit/export?entityType=Loan&entityId=${loan.id}`,
    );
    expect(csv).toContain("action,entityType,entityId");
    expect(csv).toContain("loan.disburse");
    expect(csv).toContain(loan.id);
  });

  test("chart of accounts and the disbursement journal are visible to finance roles @http", async () => {
    const { loan } = await activateLoan();
    await expectStatus("officer", "/accounting/accounts", 403);
    await expectStatus("collector", "/accounting/journals", 403);

    const accounts = await expectOk<Array<{ code: string; name: string }>>(
      "owner",
      "/accounting/accounts",
    );
    expect(accounts.some((account) => account.code === "1100")).toBeTruthy();
    expect(accounts.some((account) => account.code === "1000")).toBeTruthy();

    const journals = await expectOk<
      Array<{
        sourceType: string;
        sourceId: string | null;
        memo: string | null;
      }>
    >("approver", "/accounting/journals?from=2027-06-01&to=2027-06-30");
    const entry = journals.find(
      (row) => row.sourceType === "DISBURSEMENT" && row.sourceId === loan.id,
    );
    expect(entry?.memo).toBe("Loan disbursement");
  });
});
