import { expect, test } from "@playwright/test";
import { apiBaseUrl } from "../env";
import {
  acme,
  errorMessage,
  expectOk,
  expectStatus,
  loginWith,
  patch,
  post,
  type SessionUser,
  uniqueStamp,
} from "./helpers";

test.describe("organization @http", () => {
  test("system admin opens a company and the owner can read only that company @http", async () => {
    const stamp = uniqueStamp();
    const created = await expectOk<{
      id: string;
      slug: string;
      settings: { graceDays: number };
    }>(
      "admin",
      "/companies",
      post({
        name: `Flow NBFC ${stamp}`,
        slug: `flow-${stamp}`,
        ownerName: "Flow Owner",
        ownerEmail: `flow-owner-${stamp}@example.com`,
        ownerPassword: "password",
      }),
    );
    expect(created.slug).toBe(`flow-${stamp}`);
    expect(created.settings.graceDays).toBe(0);

    const companies = await expectOk<Array<{ id: string }>>(
      "admin",
      "/companies",
    );
    expect(companies.some((company) => company.id === created.id)).toBeTruthy();

    await expectStatus("owner", "/companies", 403);

    const newOwner = await loginWith(
      `flow-owner-${stamp}@example.com`,
      "password",
    );
    const own = await fetch(`${apiBaseUrl}/companies/${created.id}`, {
      headers: { Authorization: `Bearer ${newOwner.accessToken}` },
    });
    expect(own.status).toBe(200);

    await expectStatus("owner", `/companies/${created.id}`, 403);

    const duplicate = await expectStatus(
      "admin",
      "/companies",
      409,
      post({
        name: "Duplicate",
        slug: `flow-${stamp}`,
        ownerName: "Other",
        ownerEmail: `other-${stamp}@example.com`,
      }),
    );
    expect(errorMessage(duplicate.data)).toContain("slug");
  });

  test("owner updates company settings and a loan officer cannot @http", async () => {
    const { companyId } = await acme();
    const before = await expectOk<{ settings: { graceDays: number } }>(
      "owner",
      `/companies/${companyId}`,
    );
    const updated = await expectOk<{
      graceDays: number;
      maxRestructures: number;
    }>(
      "owner",
      `/companies/${companyId}/settings`,
      patch({ graceDays: 4, maxRestructures: 3, foreclosureChargePercent: 2 }),
    );
    expect(updated.graceDays).toBe(4);

    await expectOk(
      "owner",
      `/companies/${companyId}/settings`,
      patch({ graceDays: before.settings.graceDays }),
    );
    await expectStatus(
      "officer",
      `/companies/${companyId}/settings`,
      403,
      patch({ graceDays: 9 }),
    );
  });

  test("owner creates a branch, blocks a duplicate code, and an officer cannot create one @http", async () => {
    const stamp = uniqueStamp();
    const branch = await expectOk<{ id: string; code: string }>(
      "owner",
      "/branches",
      post({ name: `East ${stamp}`, code: `E${stamp}`.slice(0, 12) }),
    );
    expect(branch.code.length).toBeGreaterThan(0);

    const listed = await expectOk<Array<{ id: string }>>(
      "officer",
      "/branches",
    );
    expect(listed.some((row) => row.id === branch.id)).toBeTruthy();

    await expectStatus(
      "owner",
      "/branches",
      409,
      post({ name: "East again", code: branch.code }),
    );
    await expectStatus(
      "officer",
      "/branches",
      403,
      post({ name: "Nope", code: `N${stamp}`.slice(0, 12) }),
    );

    const renamed = await expectOk<{ name: string; active: boolean }>(
      "owner",
      `/branches/${branch.id}`,
      patch({ name: `East renamed ${stamp}`, active: false }),
    );
    expect(renamed.active).toBe(false);
  });

  test("owner provisions staff, and role or email conflicts are rejected @http", async () => {
    const { companyId, branchId } = await acme();
    const stamp = uniqueStamp();
    const email = `officer-${stamp}@example.com`;
    const created = await expectOk<SessionUser>(
      "owner",
      "/users",
      post({
        name: "Flow Officer",
        email,
        role: "LOAN_OFFICER",
        branchId,
        password: "password",
      }),
    );
    expect(created.role).toBe("LOAN_OFFICER");
    expect(created.branchId).toBe(branchId);

    const session = await loginWith(email, "password");
    expect(session.user.id).toBe(created.id);

    const officer = await expectOk<SessionUser>("officer", "/auth/me");
    const selfList = await expectOk<SessionUser[]>("officer", "/users");
    expect(selfList.map((user) => user.id)).toEqual([officer.id]);

    await expectStatus(
      "owner",
      "/users",
      409,
      post({
        name: "Duplicate",
        email,
        role: "LOAN_OFFICER",
        branchId,
      }),
    );
    await expectStatus(
      "owner",
      "/users",
      400,
      post({
        name: "Admin",
        email: `sys-${stamp}@example.com`,
        role: "SYSTEM_ADMIN",
      }),
    );
    await expectStatus(
      "officer",
      "/users",
      403,
      post({
        name: "Blocked",
        email: `blocked-${stamp}@example.com`,
        role: "LOAN_OFFICER",
        branchId,
      }),
    );

    const roster = await expectOk<Array<{ userId: string }>>(
      "owner",
      "/users/performance",
    );
    expect(roster.length).toBeGreaterThan(0);

    const mine = await expectOk<{ userId: string }>(
      "officer",
      `/users/${officer.id}/performance`,
    );
    expect(mine.userId).toBe(officer.id);

    await expectOk("owner", `/users/${created.id}`, patch({ active: false }));
    await expect(loginWith(email, "password")).rejects.toThrow(/401/);

    const adminList = await expectOk<SessionUser[]>(
      "admin",
      `/users?companyId=${companyId}`,
    );
    expect(adminList.some((user) => user.email === email)).toBeTruthy();
    await expectStatus("admin", "/users", 400);
  });
});
