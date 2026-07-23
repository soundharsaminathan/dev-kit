import type { AuthUser } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

export function isStudentOnboardingIncomplete(
  user: Pick<AuthUser, "role" | "onboardingCompletedAt" | "name"> & {
    role: UserRole;
  },
) {
  if (user.role !== "STUDENT") {
    return false;
  }
  return !user.onboardingCompletedAt;
}

export function memberHomePathForUser(
  user: AuthUser,
): "/me" | "/me/onboarding" {
  return isStudentOnboardingIncomplete(user) ? "/me/onboarding" : "/me";
}
