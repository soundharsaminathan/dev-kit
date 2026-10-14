import { describe, expect, it } from "vitest";
import { homePathForUser, STAFF_ROLES } from "./constants";

describe("homePathForUser", () => {
  it("sends system admin to /admin", () => {
    expect(homePathForUser("SYSTEM_ADMIN")).toBe("/admin");
  });

  it("sends staff roles to /app", () => {
    for (const role of STAFF_ROLES) {
      expect(homePathForUser(role)).toBe("/app");
    }
  });
});
