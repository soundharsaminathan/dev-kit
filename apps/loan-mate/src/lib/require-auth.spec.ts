import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import type { AuthContextValue, AuthUser } from "@/lib/auth";
import { type UserRole } from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  requireAuth,
  requireStaff,
  requireSystemAdmin,
  safeInternalPath,
} from "@/lib/require-auth";

const STAFF: UserRole[] = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "LOAN_OFFICER",
  "APPROVER",
  "COLLECTION_OFFICER",
];

function user(role: UserRole): AuthUser {
  return {
    id: "user-1",
    email: `${role.toLowerCase()}@loan-mate.local`,
    name: role,
    role,
    companyId: role === "SYSTEM_ADMIN" ? null : "company-1",
  };
}

function session(role: UserRole | null): AuthContextValue {
  return {
    user: role ? user(role) : null,
    token: role ? "token" : null,
    loading: false,
    api: {} as AuthContextValue["api"],
    login: async () => {
      throw new Error("unused");
    },
    loginAsSeed: async () => {
      throw new Error("unused");
    },
    loginAs: async () => {
      throw new Error("unused");
    },
    logout: () => {},
    refreshMe: async () => null,
    homePath: role ? homePathForUser(role) : "/login",
  };
}

function captureRedirect(run: () => void) {
  try {
    run();
  } catch (error) {
    expect(isRedirect(error)).toBe(true);
    if (!isRedirect(error)) throw error;
    return error.options;
  }
  throw new Error("expected a redirect");
}

describe("staff shell routing", () => {
  it("sends the system admin home to /admin and every other role to /app", () => {
    expect(homePathForUser("SYSTEM_ADMIN")).toBe("/admin");
    for (const role of STAFF) {
      expect(homePathForUser(role)).toBe("/app");
    }
  });

  it("sends an anonymous visitor to login and keeps an internal return path", () => {
    const options = captureRedirect(() =>
      requireStaff(session(null), {
        pathname: "/app/loans",
        searchStr: "?status=ACTIVE",
      }),
    );
    expect(options.to).toBe("/login");
    expect(options.replace).toBe(true);
    expect(options.search).toEqual({ redirect: "/app/loans?status=ACTIVE" });
  });

  it("drops login and protocol-relative return paths", () => {
    const login = captureRedirect(() =>
      requireAuth(session(null), {
        roles: STAFF,
        fallback: "/admin",
        pathname: "/login",
        searchStr: "",
      }),
    );
    expect(login.search).toEqual({});

    const external = captureRedirect(() =>
      requireStaff(session(null), {
        pathname: "//evil.example",
        searchStr: "",
      }),
    );
    expect(external.search).toEqual({});
  });

  it("lets each staff role into /app and sends a system admin back to /admin", () => {
    for (const role of STAFF) {
      expect(
        requireStaff(session(role), {
          pathname: "/app",
          searchStr: "",
        }).role,
      ).toBe(role);
    }

    const bounced = captureRedirect(() =>
      requireStaff(session("SYSTEM_ADMIN"), {
        pathname: "/app/customers",
        searchStr: "",
      }),
    );
    expect(bounced.to).toBe("/admin");
    expect(bounced.replace).toBe(true);
  });

  it("lets a system admin into /admin and sends staff back to /app", () => {
    expect(
      requireSystemAdmin(session("SYSTEM_ADMIN"), {
        pathname: "/admin",
        searchStr: "",
      }).role,
    ).toBe("SYSTEM_ADMIN");

    for (const role of STAFF) {
      const bounced = captureRedirect(() =>
        requireSystemAdmin(session(role), {
          pathname: "/admin",
          searchStr: "",
        }),
      );
      expect(bounced.to).toBe("/app");
    }
  });

  it("accepts only same-origin paths", () => {
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("/app/customers/new")).toBe("/app/customers/new");
  });

  it("leaves a signed-out session on the login page", () => {
    expect(redirectIfAuthenticated(session(null), "/app")).toBeUndefined();
  });

  it("sends a signed-in user to a safe return path, otherwise their home", () => {
    const returned = captureRedirect(() =>
      redirectIfAuthenticated(session("LOAN_OFFICER"), "/app/approvals"),
    );
    expect(returned.to).toBe("/app/approvals");

    const blocked = captureRedirect(() =>
      redirectIfAuthenticated(session("LOAN_OFFICER"), "//evil.example"),
    );
    expect(blocked.to).toBe("/app");

    const admin = captureRedirect(() =>
      redirectIfAuthenticated(session("SYSTEM_ADMIN")),
    );
    expect(admin.to).toBe("/admin");
  });
});
