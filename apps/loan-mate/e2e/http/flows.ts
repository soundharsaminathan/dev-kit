import { expect } from "@playwright/test";
import {
  acme,
  approvePending,
  type Customer,
  createCustomer,
  expectOk,
  type Loan,
  type LoanDetail,
  post,
} from "./helpers";

const FUTURE_DISBURSEMENT = "2027-06-15";

export type ActivateOptions = {
  customerId?: string;
  principal?: number;
  annualRatePercent?: number;
  tenureInstallments?: number;
  frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  monthlyFirstEmiOption?:
    | "EXACT_DAY"
    | "CONVERT_TO_1ST_PARTIAL"
    | "CONVERT_TO_1ST_NEXT_MONTH";
  disbursementDate?: string;
  address?: string | null;
  kyc?: boolean;
};

/**
 * Officer originates, manager verifies, approver clears any product override
 * and the loan approval, manager disburses. Returns the ACTIVE loan.
 */
export async function activateLoan(
  options: ActivateOptions = {},
): Promise<{ customer: Customer; loan: LoanDetail }> {
  const catalog = await acme();
  const customer = options.customerId
    ? await expectOk<Customer>("officer", `/customers/${options.customerId}`)
    : await createCustomer({
        address: options.address,
        kyc: options.kyc,
      });

  const draft = await expectOk<Loan>(
    "officer",
    "/loans",
    post({
      customerId: customer.id,
      productId: catalog.productId,
      branchId: catalog.branchId,
      ...(options.principal !== undefined
        ? { principal: options.principal }
        : {}),
      ...(options.annualRatePercent !== undefined
        ? { annualRatePercent: options.annualRatePercent }
        : {}),
      ...(options.tenureInstallments !== undefined
        ? { tenureInstallments: options.tenureInstallments }
        : {}),
      ...(options.frequency ? { frequency: options.frequency } : {}),
      ...(options.monthlyFirstEmiOption
        ? { monthlyFirstEmiOption: options.monthlyFirstEmiOption }
        : {}),
    }),
  );

  if (draft.productOverride) {
    await approvePending("PRODUCT_OVERRIDE", draft.id);
  }

  await expectOk("officer", `/loans/${draft.id}/submit`, post({}));
  await expectOk("manager", `/loans/${draft.id}/verify`, post({}));
  const approval = await expectOk<{ id: string }>(
    "officer",
    `/loans/${draft.id}/request-approval`,
    post({}),
  );
  await expectOk("approver", `/approvals/${approval.id}/approve`, post({}));
  await expectOk(
    "manager",
    `/loans/${draft.id}/disburse`,
    post({
      disbursementDate: options.disbursementDate ?? FUTURE_DISBURSEMENT,
      mode: "NEFT",
      reference: `NEFT-${draft.loanNumber}`,
    }),
  );

  const loan = await expectOk<LoanDetail>("officer", `/loans/${draft.id}`);
  expect(loan.status).toBe("ACTIVE");
  expect(loan.installments.length).toBeGreaterThan(0);
  return { customer, loan };
}

export async function draftLoan(
  options: ActivateOptions = {},
): Promise<{ customer: Customer; loan: Loan }> {
  const catalog = await acme();
  const customer = options.customerId
    ? await expectOk<Customer>("officer", `/customers/${options.customerId}`)
    : await createCustomer({
        address: options.address,
        kyc: options.kyc,
      });
  const loan = await expectOk<Loan>(
    "officer",
    "/loans",
    post({
      customerId: customer.id,
      productId: catalog.productId,
      branchId: catalog.branchId,
      ...(options.principal !== undefined
        ? { principal: options.principal }
        : {}),
    }),
  );
  return { customer, loan };
}

export { FUTURE_DISBURSEMENT };
