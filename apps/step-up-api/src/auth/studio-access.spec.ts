import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertSameStudio, requireUserStudioId } from "./studio-access";

describe("assertSameStudio", () => {
  it("allows matching studio members", () => {
    expect(() =>
      assertSameStudio(
        { role: UserRole.STAFF, studioId: "studio-1" },
        "studio-1",
      ),
    ).not.toThrow();
  });

  it("rejects cross-studio access", () => {
    expect(() =>
      assertSameStudio(
        { role: UserRole.STAFF, studioId: "studio-1" },
        "studio-2",
      ),
    ).toThrow(ForbiddenException);
  });

  it("rejects system admins from tenant data routes", () => {
    expect(() =>
      assertSameStudio(
        { role: UserRole.SYSTEM_ADMIN, studioId: null },
        "studio-1",
      ),
    ).toThrow(ForbiddenException);
  });
});

describe("requireUserStudioId", () => {
  it("returns studio id when present", () => {
    expect(requireUserStudioId({ studioId: "studio-1" })).toBe("studio-1");
  });

  it("rejects users without a studio", () => {
    expect(() => requireUserStudioId({ studioId: null })).toThrow(
      ForbiddenException,
    );
  });
});
