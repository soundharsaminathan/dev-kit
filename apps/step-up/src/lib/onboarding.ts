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

/** Onboarding yields to forced password change to avoid a redirect loop. */
export function shouldRedirectToStudentOnboarding(
  user: Pick<
    AuthUser,
    "role" | "onboardingCompletedAt" | "name" | "mustChangePassword"
  > & {
    role: UserRole;
  },
  pathname: string,
) {
  if (!isStudentOnboardingIncomplete(user)) {
    return false;
  }
  if (pathname.startsWith("/me/onboarding")) {
    return false;
  }
  if (user.mustChangePassword) {
    return false;
  }
  return true;
}

export function memberHomePathForUser(
  user: AuthUser,
): "/me" | "/me/onboarding" {
  return isStudentOnboardingIncomplete(user) ? "/me/onboarding" : "/me";
}
