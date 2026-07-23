import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "@/lib/auth-context";
import { DEV_USERS } from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  requireAuth,
  safeInternalPath,
} from "@/lib/require-auth";

function authWith(user: AuthContextValue["user"]): AuthContextValue {
  return {
    user,
    loading: false,
    emailVerified: true,
    hasPasswordProvider: false,
    needsEmailVerification: false,
    loginAsDev: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    changeEmail: vi.fn(),
    resendEmailVerification: vi.fn(),
    refreshEmailVerification: vi.fn(),
    signOutUser: vi.fn(),
    getIdToken: vi.fn(),
    updateUser: vi.fn(),
  };
}

describe("requireAuth", () => {
  it("redirects guests to login with return path", () => {
    try {
      requireAuth(authWith(null), {
        roles: ["STUDENT", "PARENT"],
        fallback: "/app",
        pathname: "/me/bookings",
        searchStr: "",
      });
      expect.fail("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/login");
        expect(error.options.search).toEqual({ redirect: "/me/bookings" });
      }
    }
  });

  it("redirects wrong role to fallback shell", () => {
    try {
      requireAuth(authWith(DEV_USERS.STUDENT), {
        roles: ["OWNER", "STAFF", "TRAINER"],
        fallback: "/me",
        pathname: "/app",
        searchStr: "",
      });
      expect.fail("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/me");
      }
    }
  });

  it("returns the user when role is allowed", () => {
    const user = requireAuth(authWith(DEV_USERS.TRAINER), {
      roles: ["OWNER", "STAFF", "TRAINER"],
      fallback: "/me",
      pathname: "/app",
      searchStr: "",
    });
    expect(user.role).toBe("TRAINER");
  });
});

describe("safeInternalPath", () => {
  it("accepts internal paths and rejects open redirects", () => {
    expect(safeInternalPath("/me/feed")).toBe("/me/feed");
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});

describe("homePathForUser", () => {
  it("routes staff to /app and members to /me", () => {
    expect(homePathForUser(DEV_USERS.OWNER)).toBe("/app");
    expect(homePathForUser(DEV_USERS.STUDENT)).toBe("/me");
  });
});

describe("redirectIfAuthenticated", () => {
  it("bounces signed-in users away from login", () => {
    try {
      redirectIfAuthenticated(authWith(DEV_USERS.STAFF));
      expect.fail("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/app");
      }
    }
  });
});
