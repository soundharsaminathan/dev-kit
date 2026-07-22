import { describe, expect, it } from "vitest";
import {
  DEV_USERS,
  findDevUserByLogin,
  resolveLoginEmail,
  STUDIO_ID,
} from "@/lib/constants";

describe("step-up constants", () => {
  it("uses seeded studio id", () => {
    expect(STUDIO_ID).toBe("studio-seed-1");
  });

  it("maps dev users to seed ids", () => {
    expect(DEV_USERS.OWNER.id).toBe("owner-1");
    expect(DEV_USERS.STUDENT.id).toBe("student-1");
  });

  it("resolves login usernames and ids to emails", () => {
    expect(resolveLoginEmail("trainer-1")).toBe("trainer@stepup.dev");
    expect(resolveLoginEmail("TRAINER")).toBe("trainer@stepup.dev");
    expect(resolveLoginEmail("trainer")).toBe("trainer@stepup.dev");
    expect(resolveLoginEmail("trainer@stepup.dev")).toBe("trainer@stepup.dev");
    expect(resolveLoginEmail("someone@example.com")).toBe(
      "someone@example.com",
    );
    expect(findDevUserByLogin("owner-1")?.role).toBe("OWNER");
  });

  it("rejects unknown usernames without an @", () => {
    expect(() => resolveLoginEmail("not-a-user")).toThrow(/Unknown username/);
  });
});
