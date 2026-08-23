import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSameStudio, requireUserStudioId } from "./studio-access";
import { slugifyStudioName, uniquifySlug } from "../tenancy/studio-slug";
import { TenantResolverService } from "../tenancy/tenant-resolver.service";
import { StudioContextGuard } from "../tenancy/studio-context.guard";

describe("assertSameStudio", () => {
  it("allows matching studio members", () => {
    const ctx = assertSameStudio(
      { id: "user-1", role: UserRole.STAFF, studioId: "studio-1" },
      "studio-1",
    );
    expect(ctx.studioId).toBe("studio-1");
    expect(ctx.userId).toBe("user-1");
  });

  it("rejects cross-studio access", () => {
    expect(() =>
      assertSameStudio(
        { role: UserRole.STAFF, studioId: "studio-1" },
        "studio-2",
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertSameStudio(
        { role: UserRole.STAFF, studioId: "studio-1" },
        "studio-2",
      ),
    ).toThrow(/don't have access to this studio/i);
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

describe("studio slug helpers", () => {
  it("slugifies names", () => {
    expect(slugifyStudioName("ABC Dance!")).toBe("abc-dance");
  });

  it("uniquifies colliding slugs", () => {
    const taken = new Set(["abc-dance"]);
    expect(uniquifySlug("abc-dance", taken)).toBe("abc-dance-2");
  });
});

describe("TenantResolverService", () => {
  const prisma = {
    studio: {
      findUnique: vi.fn(),
    },
  };

  let service: TenantResolverService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantResolverService(prisma as never);
  });

  it("resolves by slug", async () => {
    prisma.studio.findUnique.mockResolvedValue({
      id: "studio-1",
      slug: "abc-dance",
      name: "ABC Dance",
      status: "ACTIVE",
      logoUrl: null,
      address: null,
      contact: null,
    });
    await expect(
      service.resolveActive({ kind: "slug", value: "abc-dance" }),
    ).resolves.toMatchObject({ id: "studio-1", slug: "abc-dance" });
  });

  it("rejects suspended studios", async () => {
    prisma.studio.findUnique.mockResolvedValue({
      id: "studio-1",
      slug: "abc-dance",
      name: "ABC Dance",
      status: "SUSPENDED",
      logoUrl: null,
      address: null,
      contact: null,
    });
    await expect(
      service.resolveActive({ kind: "slug", value: "abc-dance" }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("StudioContextGuard", () => {
  const tenants = {
    resolveActive: vi.fn(),
  };

  let guard: StudioContextGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new StudioContextGuard(tenants as never);
  });

  it("attaches studio context when user matches requested studio", async () => {
    tenants.resolveActive.mockResolvedValue({
      id: "studio-1",
      slug: "abc-dance",
      status: "ACTIVE",
    });
    const request = {
      user: {
        id: "user-1",
        role: UserRole.STAFF,
        studioId: "studio-1",
      },
      params: { studioId: "studio-1" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).toMatchObject({
      studioContext: {
        studioId: "studio-1",
        userId: "user-1",
        role: UserRole.STAFF,
        slug: "abc-dance",
      },
    });
  });

  it("denies cross-studio path access", async () => {
    tenants.resolveActive.mockResolvedValue({
      id: "studio-2",
      slug: "other",
      status: "ACTIVE",
    });
    const request = {
      user: {
        id: "user-1",
        role: UserRole.STAFF,
        studioId: "studio-1",
      },
      params: { studioId: "studio-2" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      /don't have access to this studio/i,
    );
  });
});
