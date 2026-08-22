import { redirect } from "@tanstack/react-router";
import type { AuthContextValue } from "@/lib/auth";
import {
  ADMIN_ROLES,
  MEMBER_ROLES,
  STAFF_ROLES,
  type UserRole,
} from "@/lib/constants";
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

export function changePasswordPathForUser(
  user: NonNullable<AuthContextValue["user"]>,
) {
  if (user.role === "SYSTEM_ADMIN") {
    return "/admin" as const;
  }
  if (STAFF_ROLES.includes(user.role)) {
    return "/app/profile/change-password" as const;
  }
  if (MEMBER_ROLES.includes(user.role)) {
    return "/me/profile/change-password" as const;
  }
  return "/app/profile/change-password" as const;
}

function isChangePasswordPath(pathname: string) {
  return (
    pathname === "/app/profile/change-password" ||
    pathname === "/me/profile/change-password"
  );
}

function enforceMustChangePassword(
  user: NonNullable<AuthContextValue["user"]>,
  pathname: string,
) {
  // Platform admin has no change-password route under /admin, and /app
  // rejects SYSTEM_ADMIN — sending them there looks like a failed login.
  if (
    user.role === "SYSTEM_ADMIN" ||
    !user.mustChangePassword ||
    isChangePasswordPath(pathname)
  ) {
    return;
  }
  throw redirect({
    to: changePasswordPathForUser(user),
    replace: true,
  });
}

export function requireAuth(
  auth: AuthContextValue,
  options: {
    roles: UserRole[];
    fallback: "/app" | "/me" | "/";
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

  enforceMustChangePassword(auth.user, options.pathname);

  return auth.user;
}

/** OWNER/STAFF studio-admin routes under /app — trainers bounce home. */
export function requireAdmin(
  auth: AuthContextValue,
  options: { pathname: string; searchStr: string },
) {
  return requireAuth(auth, {
    roles: ADMIN_ROLES,
    fallback: "/app",
    pathname: options.pathname,
    searchStr: options.searchStr,
  });
}

export function safeInternalPath(path: string | undefined): string | null {
  if (!path?.startsWith("/") || path.startsWith("//")) {
    return null;
  }
  return path;
}

export function homePathForUser(user: NonNullable<AuthContextValue["user"]>) {
  if (user.role === "SYSTEM_ADMIN") {
    return "/admin" as const;
  }
  if (user.mustChangePassword) {
    return changePasswordPathForUser(user);
  }
  if (STAFF_ROLES.includes(user.role)) {
    return "/app" as const;
  }
  if (MEMBER_ROLES.includes(user.role)) {
    return memberHomePathForUser(user);
  }
  return "/" as const;
}

/** Platform admin routes under /admin. */
export function requireSystemAdmin(
  auth: AuthContextValue,
  options: { pathname: string; searchStr: string },
) {
  return requireAuth(auth, {
    roles: ["SYSTEM_ADMIN"],
    fallback: "/",
    pathname: options.pathname,
    searchStr: options.searchStr,
  });
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

  if (user.mustChangePassword && user.role !== "SYSTEM_ADMIN") {
    throw redirect({
      to: changePasswordPathForUser(user),
      replace: true,
    });
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
