import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth";
import {
  isStudentOnboardingIncomplete,
  memberHomePathForUser,
  shouldRedirectToStudentOnboarding,
} from "@/lib/onboarding";

function student(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "student-1",
    email: "student@stepup.dev",
    name: "Alex",
    role: "STUDENT",
    studioId: "studio-seed-1",
    onboardingCompletedAt: null,
    ...overrides,
  };
}

describe("student onboarding gate", () => {
  it("requires onboarding when completedAt is missing", () => {
    expect(isStudentOnboardingIncomplete(student())).toBe(true);
    expect(memberHomePathForUser(student())).toBe("/me/onboarding");
    expect(
      shouldRedirectToStudentOnboarding(student(), "/me/profile/change-password"),
    ).toBe(true);
  });

  it("skips onboarding when completedAt is set", () => {
    const done = student({
      onboardingCompletedAt: "2026-07-22T00:00:00.000Z",
    });
    expect(isStudentOnboardingIncomplete(done)).toBe(false);
    expect(memberHomePathForUser(done)).toBe("/me");
    expect(shouldRedirectToStudentOnboarding(done, "/me")).toBe(false);
  });

  it("never gates parents", () => {
    const parent = student({
      role: "PARENT",
      onboardingCompletedAt: null,
    });
    expect(isStudentOnboardingIncomplete(parent)).toBe(false);
    expect(memberHomePathForUser(parent)).toBe("/me");
  });

  it("does not send mustChangePassword students to onboarding", () => {
    const reset = student({ mustChangePassword: true });
    expect(
      shouldRedirectToStudentOnboarding(reset, "/me/profile/change-password"),
    ).toBe(false);
    expect(shouldRedirectToStudentOnboarding(reset, "/me")).toBe(false);
    expect(
      shouldRedirectToStudentOnboarding(reset, "/me/onboarding"),
    ).toBe(false);
  });
});
