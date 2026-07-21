import { redirect } from "@tanstack/react-router";
import type { AuthContextValue } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

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
