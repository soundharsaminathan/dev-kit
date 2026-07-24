import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_USERS } from "../test/fixtures/users";
import { RolesGuard } from "./roles.guard";

type MatrixRow = {
  action: string;
  allowed: UserRole[];
};

/**
 * High-value @Roles contracts. Keep in sync with controller decorators.
 * If a product change updates @Roles, update this table — do not weaken it.
 */
const PERMISSION_MATRIX: MatrixRow[] = [
  {
    action: "attendance.mark / session.roster",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "sessions.create / update",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "batches.create / update",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "batches.delete",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "batches.enroll (member self / family)",
    allowed: [
      UserRole.STUDENT,
      UserRole.PARENT,
      UserRole.OWNER,
      UserRole.STAFF,
    ],
  },
  {
    action: "bookings.staff.list / manage",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "bookings.confirm-payment / abandon-payment",
    allowed: [UserRole.STUDENT, UserRole.PARENT],
  },
  {
    action: "billing.markPaid",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "billing.listByStudio",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "subscriptions.catalog.write",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "memberships.assign",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "memberships.purchase / renew.self",
    allowed: [UserRole.STUDENT, UserRole.PARENT],
  },
  {
    action: "home.goals",
    allowed: [UserRole.STUDENT, UserRole.PARENT],
  },
  {
    action: "studios.write",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "studios.transferOwnership",
    allowed: [UserRole.OWNER],
  },
  {
    action: "retention.dashboard",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "certificates.templates.write",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "contests.manage",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "contests.enter",
    allowed: [UserRole.STUDENT, UserRole.PARENT],
  },
  {
    action: "contests.score",
    allowed: [UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "users.staff.ops",
    allowed: [UserRole.OWNER, UserRole.STAFF],
  },
  {
    action: "users.roster.read",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER],
  },
  {
    action: "users.family.link",
    allowed: [UserRole.OWNER, UserRole.STAFF, UserRole.PARENT],
  },
];

const ALL_ROLES = [
  UserRole.OWNER,
  UserRole.STAFF,
  UserRole.TRAINER,
  UserRole.STUDENT,
  UserRole.PARENT,
] as const;

function makeContext(role: UserRole) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: Object.values(FIXTURE_USERS).find((user) => user.role === role),
      }),
    }),
  };
}

describe("permission matrix", () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };
  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  for (const row of PERMISSION_MATRIX) {
    describe(row.action, () => {
      for (const role of ALL_ROLES) {
        const shouldAllow = row.allowed.includes(role);
        it(`${role} → ${shouldAllow ? "allow" : "deny"}`, () => {
          reflector.getAllAndOverride.mockReturnValue(row.allowed);
          if (shouldAllow) {
            expect(guard.canActivate(makeContext(role) as never)).toBe(true);
          } else {
            expect(() => guard.canActivate(makeContext(role) as never)).toThrow(
              ForbiddenException,
            );
          }
        });
      }
    });
  }
});
