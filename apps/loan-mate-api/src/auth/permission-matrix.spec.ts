import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "../generated/prisma/client";
import { RolesGuard } from "./roles.guard";

type MatrixRow = {
  action: string;
  allowed: UserRole[];
};

/**
 * High-value @Roles contracts. Keep in sync with controller decorators.
 */
const PERMISSION_MATRIX: MatrixRow[] = [
  {
    action: "companies.create / list",
    allowed: [UserRole.SYSTEM_ADMIN],
  },
  {
    action: "companies.settings.update",
    allowed: [UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN],
  },
  {
    action: "branches.create / update",
    allowed: [
      UserRole.SYSTEM_ADMIN,
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
    ],
  },
  {
    action: "users.create / update",
    allowed: [
      UserRole.SYSTEM_ADMIN,
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
    ],
  },
  {
    action: "users.list / get / performance",
    allowed: [
      UserRole.SYSTEM_ADMIN,
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.LOAN_OFFICER,
      UserRole.APPROVER,
      UserRole.COLLECTION_OFFICER,
    ],
  },
  {
    action: "customers.create",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.LOAN_OFFICER,
    ],
  },
  {
    action: "customers.assign_collection",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
    ],
  },
  {
    action: "customers.blacklist / delete",
    allowed: [UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN],
  },
  {
    action: "products.create / update",
    allowed: [UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN],
  },
  {
    action: "loans.create / submit",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.LOAN_OFFICER,
    ],
  },
  {
    action: "loans.approve / reject",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.APPROVER,
    ],
  },
  {
    action: "loans.disburse",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
    ],
  },
  {
    action: "payments.record",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.COLLECTION_OFFICER,
    ],
  },
  {
    action: "payments.reverse / waiver.execute",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.APPROVER,
    ],
  },
  {
    action: "approvals.decide",
    allowed: [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_ADMIN,
      UserRole.APPROVER,
    ],
  },
];

function mockContext(role: UserRole) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role, id: "u1", active: true } }),
    }),
  };
}

describe("permission matrix", () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  for (const row of PERMISSION_MATRIX) {
    it(`${row.action}: allows listed roles only`, () => {
      reflector.getAllAndOverride.mockReturnValue(row.allowed);

      for (const role of Object.values(UserRole)) {
        const allowed = row.allowed.includes(role);
        if (allowed) {
          expect(guard.canActivate(mockContext(role) as never)).toBe(true);
        } else {
          expect(() =>
            guard.canActivate(mockContext(role) as never),
          ).toThrow(ForbiddenException);
        }
      }
    });
  }
});
