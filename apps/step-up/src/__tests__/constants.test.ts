import { describe, expect, it } from "vitest";
import { DEV_USERS, STUDIO_ID } from "@/lib/constants";

describe("step-up constants", () => {
  it("uses seeded studio id", () => {
    expect(STUDIO_ID).toBe("studio-seed-1");
  });

  it("maps dev users to seed ids", () => {
    expect(DEV_USERS.OWNER.id).toBe("owner-1");
    expect(DEV_USERS.STUDENT.id).toBe("student-1");
  });
});
