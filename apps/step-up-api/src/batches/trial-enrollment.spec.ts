import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  enrollmentAllowsTrialSession,
  parseTrialSessionIds,
  resolveNextTrialSessionIds,
  TRIAL_SESSION_LIMIT,
} from "./trial-enrollment";

describe("trial-enrollment helpers", () => {
  it("parses trial session id arrays", () => {
    expect(parseTrialSessionIds(["a", "b"])).toEqual(["a", "b"]);
    expect(parseTrialSessionIds(null)).toEqual([]);
    expect(parseTrialSessionIds(["a", 1, "b"])).toEqual(["a", "b"]);
  });

  it("allows only trial enrollments for listed sessions", () => {
    expect(
      enrollmentAllowsTrialSession(
        { isTrial: true, trialSessionIds: ["s1", "s2"] },
        "s1",
      ),
    ).toBe(true);
    expect(
      enrollmentAllowsTrialSession(
        { isTrial: true, trialSessionIds: ["s1"] },
        "s9",
      ),
    ).toBe(false);
    expect(
      enrollmentAllowsTrialSession(
        { isTrial: false, trialSessionIds: ["s1"] },
        "s1",
      ),
    ).toBe(false);
  });

  it("resolves the next upcoming scheduled sessions", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    const ids = await resolveNextTrialSessionIds(
      { session: { findMany } },
      "batch-1",
    );
    expect(ids).toEqual(["s1", "s2"]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ batchId: "batch-1" }),
        take: TRIAL_SESSION_LIMIT,
      }),
    );
  });

  it("rejects trial enroll when no upcoming sessions exist", async () => {
    await expect(
      resolveNextTrialSessionIds(
        { session: { findMany: vi.fn().mockResolvedValue([]) } },
        "batch-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
