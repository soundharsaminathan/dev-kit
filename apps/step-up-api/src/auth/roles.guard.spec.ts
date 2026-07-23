import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES_KEY } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";

function makeContext(user: { role: UserRole } | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };
}

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it("allows when no roles metadata is set", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(
      guard.canActivate(makeContext({ role: UserRole.STUDENT }) as never),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("allows when required roles list is empty", () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(
      guard.canActivate(makeContext({ role: UserRole.STUDENT }) as never),
    ).toBe(true);
  });

  it("allows when the user role is in the required list", () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.OWNER,
      UserRole.STAFF,
    ]);
    expect(
      guard.canActivate(makeContext({ role: UserRole.STAFF }) as never),
    ).toBe(true);
  });

  it("rejects when the user role is missing from the required list", () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.OWNER,
      UserRole.STAFF,
    ]);
    expect(() =>
      guard.canActivate(makeContext({ role: UserRole.TRAINER }) as never),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(makeContext({ role: UserRole.TRAINER }) as never),
    ).toThrow(/Insufficient permissions/);
  });
});
