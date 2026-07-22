import { redirect } from "@tanstack/react-router";
import type { AuthContextValue } from "@/lib/auth";
import { MEMBER_ROLES, STAFF_ROLES, type UserRole } from "@/lib/constants";
import { memberHomePathForUser } from "@/lib/onboarding";

export type RouterAuthContext = {
  auth: AuthContextValue;
};

function loginRedirectPath(pathname: string, searchStr: string) {
  const path = `${pathname}${searchStr}`;
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/login")
  ) {
    return undefined;
  }
  return path;
}

export function requireAuth(
  auth: AuthContextValue,
  options: {
    roles: UserRole[];
    fallback: "/app" | "/me";
    pathname: string;
    searchStr: string;
  },
) {
  if (!auth.user) {
    const redirectPath = loginRedirectPath(options.pathname, options.searchStr);
    throw redirect({
      to: "/login",
      search: redirectPath ? { redirect: redirectPath } : {},
      replace: true,
    });
  }

  if (!options.roles.includes(auth.user.role)) {
    throw redirect({
      to: options.fallback,
      replace: true,
    });
  }

  return auth.user;
}

export function safeInternalPath(path: string | undefined): string | null {
  if (!path?.startsWith("/") || path.startsWith("//")) {
    return null;
  }
  return path;
}

export function homePathForUser(user: NonNullable<AuthContextValue["user"]>) {
  if (STAFF_ROLES.includes(user.role)) {
    return "/app" as const;
  }
  if (MEMBER_ROLES.includes(user.role)) {
    return memberHomePathForUser(user);
  }
  return "/" as const;
}

/** Bounce signed-in users away from /login and /register. */
export function redirectIfAuthenticated(
  auth: AuthContextValue,
  redirectTo?: string,
): void {
  const user = auth.user;
  if (!user) {
    return;
  }

  const safeRedirect = safeInternalPath(redirectTo);
  if (safeRedirect) {
    throw redirect({ to: safeRedirect, replace: true });
  }

  throw redirect({
    to: homePathForUser(user),
    replace: true,
  });
}
