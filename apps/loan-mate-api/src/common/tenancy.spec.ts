import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "../auth/current-user.decorator";
import { UserRole } from "../generated/prisma";
import {
  assertBranchAccess,
  assertSameCompany,
  requireCompany,
} from "./tenancy";

function user(partial: Partial<AuthUser> & Pick<AuthUser, "role">): AuthUser {
  return {
    id: partial.id ?? "u1",
    email: partial.email ?? "u@test.local",
    name: partial.name ?? "User",
    role: partial.role,
    companyId: partial.companyId ?? null,
    branchId: partial.branchId ?? null,
    active: true,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("tenancy isolation", () => {
  it("blocks cross-company access", () => {
    const actor = user({
      role: UserRole.COMPANY_OWNER,
      companyId: "company-a",
    });
    expect(() => assertSameCompany(actor, "company-b")).toThrow(
      ForbiddenException,
    );
  });

  it("allows same-company access for owner", () => {
    const actor = user({
      role: UserRole.COMPANY_OWNER,
      companyId: "company-a",
    });
    expect(() => assertSameCompany(actor, "company-a")).not.toThrow();
  });

  it("requireCompany rejects system admin without company context", () => {
    const actor = user({ role: UserRole.SYSTEM_ADMIN, companyId: null });
    expect(() => requireCompany(actor)).toThrow(BadRequestException);
  });

  it("branch-scoped roles cannot access other branches", () => {
    const actor = user({
      role: UserRole.LOAN_OFFICER,
      companyId: "company-a",
      branchId: "branch-1",
    });
    expect(() => assertBranchAccess(actor, "branch-2")).toThrow(
      ForbiddenException,
    );
    expect(() => assertBranchAccess(actor, "branch-1")).not.toThrow();
  });

  it("company owner can access any branch in company", () => {
    const actor = user({
      role: UserRole.COMPANY_OWNER,
      companyId: "company-a",
    });
    expect(() => assertBranchAccess(actor, "branch-any")).not.toThrow();
  });
});
