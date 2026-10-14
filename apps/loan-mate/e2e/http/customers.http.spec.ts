import { expect, test } from "@playwright/test";
import { activateLoan, draftLoan } from "./flows";
import {
  acme,
  approvePending,
  type Customer,
  createCustomer,
  errorMessage,
  expectOk,
  expectStatus,
  login,
  num,
  patch,
  post,
  uniqueMobile,
  uniquePan,
} from "./helpers";

test.describe("customers @http", () => {
  test("officer creates, updates, and a manager assigns collections @http", async () => {
    const customer = await createCustomer({ kyc: false, address: "1 MG Road" });
    expect(customer.customerNumber.startsWith("CUST-")).toBeTruthy();
    expect(customer.pan).toBe(customer.pan.toUpperCase());

    const renamed = await expectOk<Customer>(
      "officer",
      `/customers/${customer.id}`,
      patch({ name: `${customer.name} Updated`, address: "2 Residency Road" }),
    );
    expect(renamed.address).toBe("2 Residency Road");

    const collector = await login("collector");
    const assigned = await expectOk<Customer>(
      "manager",
      `/customers/${customer.id}/assignment`,
      patch({ collectionOfficerId: collector.user.id }),
    );
    expect(assigned.collectionOfficerId).toBe(collector.user.id);

    const cleared = await expectOk<Customer>(
      "manager",
      `/customers/${customer.id}/assignment`,
      patch({ collectionOfficerId: null }),
    );
    expect(cleared.collectionOfficerId).toBeNull();

    await expectStatus(
      "officer",
      `/customers/${customer.id}/assignment`,
      403,
      patch({ collectionOfficerId: collector.user.id }),
    );

    const listed = await expectOk<Customer[]>("approver", "/customers");
    expect(listed.some((row) => row.id === customer.id)).toBeTruthy();
    await expectStatus(
      "collector",
      "/customers",
      403,
      post({
        name: "Denied",
        mobile: uniqueMobile(),
        pan: uniquePan(),
      }),
    );
  });

  test("mobile and PAN are unique inside the company @http", async () => {
    const first = await createCustomer({ kyc: false });
    const mobileClash = await expectStatus(
      "officer",
      "/customers",
      409,
      post({
        name: "Mobile clash",
        mobile: first.mobile,
        pan: uniquePan(),
      }),
    );
    expect(errorMessage(mobileClash.data)).toContain("Mobile");

    const panClash = await expectStatus(
      "officer",
      "/customers",
      409,
      post({
        name: "PAN clash",
        mobile: uniqueMobile(),
        pan: first.pan.toLowerCase(),
      }),
    );
    expect(errorMessage(panClash.data)).toContain("PAN");
  });

  test("blacklist blocks new loans and collections stay open @http", async () => {
    const { customer, loan } = await activateLoan();
    await expectStatus(
      "officer",
      `/customers/${customer.id}/blacklist`,
      403,
      post({ blacklisted: true, reason: "fraud" }),
    );
    const missingReason = await expectStatus(
      "owner",
      `/customers/${customer.id}/blacklist`,
      400,
      post({ blacklisted: true }),
    );
    expect(errorMessage(missingReason.data)).toContain("blacklistReason");

    const blocked = await expectOk<Customer>(
      "owner",
      `/customers/${customer.id}/blacklist`,
      post({ blacklisted: true, reason: "Confirmed fraud" }),
    );
    expect(blocked.blacklisted).toBe(true);
    expect(blocked.blacklistReason ?? "").toBe("Confirmed fraud");

    const catalog = await acme();
    const denied = await expectStatus(
      "officer",
      "/loans",
      400,
      post({
        customerId: customer.id,
        productId: catalog.productId,
        branchId: catalog.branchId,
      }),
    );
    expect(errorMessage(denied.data)).toContain("blacklisted");

    const stillOpen = await expectOk<{ status: string }>(
      "officer",
      `/loans/${loan.id}`,
    );
    expect(stillOpen.status).toBe("ACTIVE");

    await expectOk(
      "owner",
      `/customers/${customer.id}/blacklist`,
      post({ blacklisted: false }),
    );
  });

  test("NPA is maker-checker, blocks origination, and leaves the existing loan collectible @http", async () => {
    const { customer, loan } = await activateLoan();
    const first = loan.installments[0]!;
    const emi = num(first.principalDue) + num(first.interestDue);

    const mark = await expectOk<{ id: string; makerId: string }>(
      "manager",
      `/customers/${customer.id}/request-npa-mark`,
      post({ reason: "Manual NPA", sourceLoanId: loan.id }),
    );
    const self = await expectStatus(
      "manager",
      `/approvals/${mark.id}/approve`,
      403,
      post({}),
    );
    expect(self.status).toBe(403);

    const ownerMark = await expectOk<{ id: string }>(
      "owner",
      `/customers/${customer.id}/request-npa-mark`,
      post({ reason: "Owner mark", sourceLoanId: loan.id }),
    );
    const ownDecision = await expectStatus(
      "owner",
      `/approvals/${ownerMark.id}/approve`,
      400,
      post({}),
    );
    expect(errorMessage(ownDecision.data)).toContain("Maker cannot approve");

    await approvePending("NPA_MARK", customer.id);
    const marked = await expectOk<Customer>(
      "officer",
      `/customers/${customer.id}`,
    );
    expect(marked.npa).toBe(true);

    const catalog = await acme();
    const blocked = await expectStatus(
      "officer",
      "/loans",
      400,
      post({
        customerId: customer.id,
        productId: catalog.productId,
        branchId: catalog.branchId,
      }),
    );
    expect(errorMessage(blocked.data)).toContain("NPA");

    const payment = await expectOk<{ receiptNumber: string }>(
      "collector",
      "/payments",
      post({
        loanId: loan.id,
        amount: emi,
        paymentDate: "2027-06-15",
        mode: "UPI",
        reference: "npa-collect",
      }),
    );
    expect(payment.receiptNumber.startsWith("RCPT-")).toBeTruthy();

    const clear = await expectOk<{ id: string }>(
      "manager",
      `/customers/${customer.id}/request-npa-clear`,
      post({ reason: "Regularised" }),
    );
    await expectOk("approver", `/approvals/${clear.id}/approve`, post({}));
    const cleared = await expectOk<Customer>(
      "officer",
      `/customers/${customer.id}`,
    );
    expect(cleared.npa).toBe(false);

    const again = await expectStatus(
      "manager",
      `/customers/${customer.id}/request-npa-clear`,
      400,
      post({ reason: "again" }),
    );
    expect(errorMessage(again.data)).toContain("not NPA");
  });

  test("customer delete is blocked while any loan is not closed @http", async () => {
    const { customer, loan } = await draftLoan();
    const blocked = await expectStatus(
      "owner",
      `/customers/${customer.id}`,
      400,
      {
        method: "DELETE",
      },
    );
    expect(errorMessage(blocked.data)).toContain("non-CLOSED");
    expect(loan.status).toBe("DRAFT");

    await expectStatus("officer", `/customers/${customer.id}`, 403, {
      method: "DELETE",
    });

    const empty = await createCustomer({ kyc: false });
    const removed = await expectOk<{ deleted: boolean }>(
      "owner",
      `/customers/${empty.id}`,
      { method: "DELETE" },
    );
    expect(removed.deleted).toBe(true);
    await expectStatus("officer", `/customers/${empty.id}`, 404);
  });
});
