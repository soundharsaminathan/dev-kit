import { expect, test } from "@playwright/test";
import { apiBaseUrl } from "../env";
import { activateLoan } from "./flows";
import {
  acme,
  type Customer,
  createCustomer,
  errorMessage,
  expectOk,
  expectStatus,
  type LoanDetail,
  loginWith,
  post,
  uniqueMobile,
  uniquePan,
  uniqueStamp,
} from "./helpers";

test.describe("tenancy @http", () => {
  test("a company owner cannot read or originate in another company @http", async () => {
    const stamp = uniqueStamp();
    const created = await expectOk<{ id: string }>(
      "admin",
      "/companies",
      post({
        name: `Isolated ${stamp}`,
        slug: `iso-${stamp}`,
        ownerName: "Isolated Owner",
        ownerEmail: `iso-${stamp}@example.com`,
        ownerPassword: "password",
      }),
    );

    await expectStatus("owner", `/companies/${created.id}`, 403);

    const other = await loginWith(`iso-${stamp}@example.com`, "password");
    const branch = await authed<{ id: string }>(
      other.accessToken,
      "/branches",
      {
        method: "POST",
        body: JSON.stringify({ name: "Only", code: `I${stamp}`.slice(0, 12) }),
      },
    );
    const product = await authed<{ id: string }>(
      other.accessToken,
      "/products",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Isolated product",
          code: `ISO${stamp}`.slice(0, 12).toUpperCase(),
          defaultPrincipal: 20000,
          defaultAnnualRate: 18,
          defaultTenure: 6,
        }),
      },
    );
    const customer = await authed<Customer>(other.accessToken, "/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Other customer",
        mobile: uniqueMobile(),
        pan: uniquePan(),
        address: "Elsewhere",
      }),
    });

    await expectStatus("owner", `/customers/${customer.id}`, 403);
    const crossLoan = await expectStatus(
      "owner",
      "/loans",
      404,
      post({
        customerId: customer.id,
        productId: product.id,
        branchId: branch.id,
      }),
    );
    expect(errorMessage(crossLoan.data)).toMatch(/not found|Customer/);

    const accounts = await authed<Array<{ code: string }>>(
      other.accessToken,
      "/accounting/accounts",
    );
    expect(accounts.some((account) => account.code === "1100")).toBeTruthy();
  });

  test("a branch officer cannot open or originate a loan on another branch @http", async () => {
    const { loan } = await activateLoan();
    const { companyId } = await acme();
    const stamp = uniqueStamp();
    const branch = await expectOk<{ id: string }>(
      "owner",
      "/branches",
      post({ name: `North ${stamp}`, code: `N${stamp}`.slice(0, 12) }),
    );
    const email = `north-${stamp}@example.com`;
    await expectOk(
      "owner",
      "/users",
      post({
        name: "North Officer",
        email,
        role: "LOAN_OFFICER",
        branchId: branch.id,
        password: "password",
        companyId,
      }),
    );
    const north = await loginWith(email, "password");

    const hidden = await fetch(`${apiBaseUrl}/loans/${loan.id}`, {
      headers: { Authorization: `Bearer ${north.accessToken}` },
    });
    expect(hidden.status).toBe(403);

    const customer = await createCustomer();
    const denied = await fetch(`${apiBaseUrl}/loans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${north.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: customer.id,
        productId: (await acme()).productId,
        branchId: loan.branchId,
      }),
    });
    expect(denied.status).toBe(403);

    const own = await fetch(`${apiBaseUrl}/loans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${north.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: customer.id,
        productId: (await acme()).productId,
        branchId: branch.id,
      }),
    });
    expect(own.status).toBe(201);
  });

  test("collection list is limited to the officer assignment @http", async () => {
    const assignedCustomer = await createCustomer({ kyc: true });
    const collector = await expectOk<{ id: string }>("collector", "/auth/me");
    await expectOk("manager", `/customers/${assignedCustomer.id}/assignment`, {
      method: "PATCH",
      body: JSON.stringify({ collectionOfficerId: collector.id }),
    });
    const assigned = await activateLoan({ customerId: assignedCustomer.id });
    const other = await activateLoan();

    const visible = await expectOk<Array<{ id: string }>>(
      "collector",
      "/loans",
    );
    expect(visible.some((row) => row.id === assigned.loan.id)).toBeTruthy();
    expect(visible.some((row) => row.id === other.loan.id)).toBeFalsy();

    const direct = await expectOk<LoanDetail>(
      "collector",
      `/loans/${other.loan.id}`,
    );
    expect(direct.id).toBe(other.loan.id);
  });
});

async function authed<T>(
  accessToken: string,
  pathName: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${pathName}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  expect(response.ok, `${pathName} → ${response.status} ${text}`).toBeTruthy();
  return JSON.parse(text) as T;
}
