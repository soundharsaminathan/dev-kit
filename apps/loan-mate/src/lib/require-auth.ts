import { redirect } from "@tanstack/react-router";
import type { AuthContextValue } from "@/lib/auth";
import {
  homePathForUser,
  STAFF_ROLES,
  SYSTEM_ADMIN_ROLES,
  type UserRole,
} from "@/lib/constants";

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
    fallback: "/app" | "/admin" | "/";
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
      to: homePathForUser(auth.user.role),
      replace: true,
    });
  }

  return auth.user;
}

export function requireStaff(
  auth: AuthContextValue,
  options: { pathname: string; searchStr: string },
) {
  return requireAuth(auth, {
    roles: STAFF_ROLES,
    fallback: "/admin",
    pathname: options.pathname,
    searchStr: options.searchStr,
  });
}

export function requireSystemAdmin(
  auth: AuthContextValue,
  options: { pathname: string; searchStr: string },
) {
  return requireAuth(auth, {
    roles: SYSTEM_ADMIN_ROLES,
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

export function redirectIfAuthenticated(
  auth: AuthContextValue,
  redirectTo?: string,
) {
  if (!auth.user) return;
  const safe = safeInternalPath(redirectTo);
  throw redirect({
    to: safe ?? homePathForUser(auth.user.role),
    replace: true,
  });
}

export { homePathForUser };
