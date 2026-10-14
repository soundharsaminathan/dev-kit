import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_USERS } from "../test/fixtures/users";
import { FeatureGuard } from "./feature.guard";
import { REQUIRE_FEATURE_KEY } from "./require-feature.decorator";
import type { StudioFeaturesService } from "./studio-features.service";

function makeContext(request: {
  user?: { role: string; studioId: string | null };
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

describe("FeatureGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };
  const studioFeatures = {
    isEnabled: vi.fn(),
  };

  let guard: FeatureGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new FeatureGuard(
      reflector as unknown as Reflector,
      studioFeatures as unknown as StudioFeaturesService,
    );
  });

  it("allows when no feature metadata is set", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(
      guard.canActivate(makeContext({ user: FIXTURE_USERS.owner }) as never),
    ).resolves.toBe(true);
    expect(studioFeatures.isEnabled).not.toHaveBeenCalled();
  });

  it("allows when all required features are enabled", async () => {
    reflector.getAllAndOverride.mockReturnValue(["bookings"]);
    studioFeatures.isEnabled.mockResolvedValue(true);
    await expect(
      guard.canActivate(
        makeContext({
          user: FIXTURE_USERS.owner,
          params: { studioId: FIXTURE_USERS.owner.studioId! },
        }) as never,
      ),
    ).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_FEATURE_KEY,
      [expect.anything(), expect.anything()],
    );
  });

  it("rejects when a required feature is disabled", async () => {
    reflector.getAllAndOverride.mockReturnValue(["bookings"]);
    studioFeatures.isEnabled.mockResolvedValue(false);
    await expect(
      guard.canActivate(
        makeContext({
          user: FIXTURE_USERS.owner,
          params: { studioId: FIXTURE_USERS.owner.studioId! },
        }) as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        makeContext({
          user: FIXTURE_USERS.owner,
          params: { studioId: FIXTURE_USERS.owner.studioId! },
        }) as never,
      ),
    ).rejects.toThrow(/not available for this studio/);
  });

  it("ignores query studioId and uses user.studioId", async () => {
    reflector.getAllAndOverride.mockReturnValue(["payments"]);
    studioFeatures.isEnabled.mockResolvedValue(true);
    await expect(
      guard.canActivate(
        makeContext({
          user: FIXTURE_USERS.owner,
          query: { studioId: "attacker-studio" },
        }) as never,
      ),
    ).resolves.toBe(true);
    expect(studioFeatures.isEnabled).toHaveBeenCalledWith(
      FIXTURE_USERS.owner.studioId,
      "payments",
      expect.anything(),
    );
  });

  it("falls back to user.studioId", async () => {
    reflector.getAllAndOverride.mockReturnValue(["chat"]);
    studioFeatures.isEnabled.mockResolvedValue(true);
    await expect(
      guard.canActivate(makeContext({ user: FIXTURE_USERS.owner }) as never),
    ).resolves.toBe(true);
  });

  it("rejects when studioId cannot be resolved", async () => {
    reflector.getAllAndOverride.mockReturnValue(["chat"]);
    await expect(
      guard.canActivate(
        makeContext({
          user: { role: "SYSTEM_ADMIN", studioId: null },
        }) as never,
      ),
    ).rejects.toThrow(/not available for this studio/);
  });
});
