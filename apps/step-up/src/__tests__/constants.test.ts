import { describe, expect, it } from "vitest";
import {
  resolveLoginEmail,
  SEED_PASSWORD,
  SEED_STUDIO_ID,
  SEED_SYSTEM_ADMIN,
} from "@/lib/constants";

describe("step-up constants", () => {
  it("exports seed studio id for fixtures", () => {
    expect(SEED_STUDIO_ID).toBe("studio-seed-1");
  });

  it("maps only the seeded system admin", () => {
    expect(SEED_SYSTEM_ADMIN.id).toBe("system-admin-1");
    expect(SEED_SYSTEM_ADMIN.email).toBe("admin@stepup.dev");
    expect(SEED_SYSTEM_ADMIN.studioId).toBeNull();
  });

  it("resolves admin aliases and passes emails through", () => {
    expect(resolveLoginEmail("admin")).toBe("admin@stepup.dev");
    expect(resolveLoginEmail("SYSTEM_ADMIN")).toBe("admin@stepup.dev");
    expect(resolveLoginEmail("system-admin-1")).toBe("admin@stepup.dev");
    expect(resolveLoginEmail("admin@stepup.dev")).toBe("admin@stepup.dev");
    expect(resolveLoginEmail("someone@example.com")).toBe(
      "someone@example.com",
    );
  });

  it("rejects unknown usernames without an @", () => {
    expect(() => resolveLoginEmail("owner")).toThrow(/Unknown username/);
    expect(() => resolveLoginEmail("not-a-user")).toThrow(/Unknown username/);
  });

  it("exports the shared seed password", () => {
    expect(SEED_PASSWORD).toBe("password");
  });
});
