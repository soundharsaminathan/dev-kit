import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import type { AuthContextValue, AuthUser } from "@/lib/auth-context";
import { SEED_SYSTEM_ADMIN, type UserRole } from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  requireAdmin,
  requireAuth,
  requireSystemAdmin,
  safeInternalPath,
} from "@/lib/require-auth";

function fixtureUser(
  role: UserRole,
  overrides: Partial<AuthUser> = {},
): AuthUser {
  return {
    id: `${role.toLowerCase()}-fixture`,
    email: `${role.toLowerCase()}@example.com`,
    name: `${role} Fixture`,
    role,
    studioId: role === "SYSTEM_ADMIN" ? null : "studio-fixture-1",
    ...overrides,
  };
}

function authWith(user: AuthContextValue["user"]): AuthContextValue {
  return {
    user,
    loading: false,
    emailVerified: true,
    hasPasswordProvider: false,
    needsEmailVerification: false,
    loginAsSystemAdmin: vi.fn(async () => SEED_SYSTEM_ADMIN),
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
        fallback: "/me",
        pathname: "/me/bookings",
        searchStr: "",
      });
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/login");
        expect(error.options.search).toEqual({ redirect: "/me/bookings" });
      }
    }
  });

  it("rejects wrong roles toward fallback", () => {
    try {
      requireAuth(authWith(fixtureUser("STUDENT")), {
        roles: ["OWNER", "STAFF"],
        fallback: "/me",
        pathname: "/app",
        searchStr: "",
      });
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/me");
      }
    }
  });

  it("returns the user when role matches", () => {
    const user = requireAuth(authWith(fixtureUser("TRAINER")), {
      roles: ["OWNER", "STAFF", "TRAINER"],
      fallback: "/app",
      pathname: "/app",
      searchStr: "",
    });
    expect(user.role).toBe("TRAINER");
  });
});

describe("requireAdmin", () => {
  it("allows owner and staff", () => {
    expect(
      requireAdmin(authWith(fixtureUser("OWNER")), {
        pathname: "/app/students",
        searchStr: "",
      }).role,
    ).toBe("OWNER");
    expect(
      requireAdmin(authWith(fixtureUser("STAFF")), {
        pathname: "/app/students",
        searchStr: "",
      }).role,
    ).toBe("STAFF");
  });

  it("bounces trainers to /app", () => {
    try {
      requireAdmin(authWith(fixtureUser("TRAINER")), {
        pathname: "/app/students",
        searchStr: "",
      });
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/app");
      }
    }
  });
});

describe("homePathForUser", () => {
  it("routes staff to /app and members to /me", () => {
    expect(homePathForUser(fixtureUser("OWNER"))).toBe("/app");
    expect(
      homePathForUser(
        fixtureUser("STUDENT", {
          onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe("/me");
  });

  it("routes system admin to /admin", () => {
    expect(homePathForUser(SEED_SYSTEM_ADMIN)).toBe("/admin");
  });

  it("keeps system admin on /admin even if mustChangePassword is set", () => {
    expect(
      homePathForUser(
        fixtureUser("SYSTEM_ADMIN", { mustChangePassword: true }),
      ),
    ).toBe("/admin");
  });

  it("sends owners with a temp password to change-password", () => {
    expect(
      homePathForUser(fixtureUser("OWNER", { mustChangePassword: true })),
    ).toBe("/app/profile/change-password");
  });

  it("sends students with a temp password to change-password before onboarding", () => {
    expect(
      homePathForUser(
        fixtureUser("STUDENT", {
          mustChangePassword: true,
          onboardingCompletedAt: null,
        }),
      ),
    ).toBe("/me/profile/change-password");
  });
});

describe("requireAuth mustChangePassword", () => {
  it("redirects owners to change-password until they update it", () => {
    try {
      requireAuth(
        authWith(fixtureUser("OWNER", { mustChangePassword: true })),
        {
          roles: ["OWNER", "STAFF", "TRAINER"],
          fallback: "/me",
          pathname: "/app",
          searchStr: "",
        },
      );
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/app/profile/change-password");
      }
    }
  });

  it("allows the change-password route while the flag is set", () => {
    const user = requireAuth(
      authWith(fixtureUser("OWNER", { mustChangePassword: true })),
      {
        roles: ["OWNER", "STAFF", "TRAINER"],
        fallback: "/me",
        pathname: "/app/profile/change-password",
        searchStr: "",
      },
    );
    expect(user.mustChangePassword).toBe(true);
  });

  it("keeps students on change-password even when onboarding is incomplete", () => {
    const user = requireAuth(
      authWith(
        fixtureUser("STUDENT", {
          mustChangePassword: true,
          onboardingCompletedAt: null,
        }),
      ),
      {
        roles: ["STUDENT", "PARENT"],
        fallback: "/app",
        pathname: "/me/profile/change-password",
        searchStr: "",
      },
    );
    expect(user.mustChangePassword).toBe(true);

    try {
      requireAuth(
        authWith(
          fixtureUser("STUDENT", {
            mustChangePassword: true,
            onboardingCompletedAt: null,
          }),
        ),
        {
          roles: ["STUDENT", "PARENT"],
          fallback: "/app",
          pathname: "/me/onboarding",
          searchStr: "",
        },
      );
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/me/profile/change-password");
      }
    }
  });
});

describe("requireSystemAdmin", () => {
  it("allows system admin", () => {
    expect(
      requireSystemAdmin(authWith(SEED_SYSTEM_ADMIN), {
        pathname: "/admin",
        searchStr: "",
      }).role,
    ).toBe("SYSTEM_ADMIN");
  });

  it("does not bounce system admin to /app change-password", () => {
    expect(
      requireSystemAdmin(
        authWith(fixtureUser("SYSTEM_ADMIN", { mustChangePassword: true })),
        {
          pathname: "/admin",
          searchStr: "",
        },
      ).role,
    ).toBe("SYSTEM_ADMIN");
  });

  it("bounces others to /", () => {
    try {
      requireSystemAdmin(authWith(fixtureUser("OWNER")), {
        pathname: "/admin",
        searchStr: "",
      });
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/");
      }
    }
  });
});

describe("safeInternalPath / redirectIfAuthenticated", () => {
  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("/app")).toBe("/app");
  });

  it("redirects signed-in users away from login", () => {
    try {
      redirectIfAuthenticated(authWith(fixtureUser("STAFF")));
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      if (isRedirect(error)) {
        expect(error.options.to).toBe("/app");
      }
    }
  });
});
