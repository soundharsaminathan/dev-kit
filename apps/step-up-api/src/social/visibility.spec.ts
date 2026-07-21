import { ProfileVisibility, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canViewContent, effectiveProfileVisibility } from "./visibility";

describe("effectiveProfileVisibility", () => {
  it("forces trainers and staff public", () => {
    expect(
      effectiveProfileVisibility({
        role: UserRole.TRAINER,
        profileVisibility: ProfileVisibility.PRIVATE,
      }),
    ).toBe(ProfileVisibility.PUBLIC);
    expect(
      effectiveProfileVisibility({
        role: UserRole.OWNER,
        profileVisibility: ProfileVisibility.PRIVATE,
      }),
    ).toBe(ProfileVisibility.PUBLIC);
  });

  it("respects student visibility", () => {
    expect(
      effectiveProfileVisibility({
        role: UserRole.STUDENT,
        profileVisibility: ProfileVisibility.PRIVATE,
      }),
    ).toBe(ProfileVisibility.PRIVATE);
    expect(
      effectiveProfileVisibility({
        role: UserRole.STUDENT,
        profileVisibility: ProfileVisibility.PUBLIC,
      }),
    ).toBe(ProfileVisibility.PUBLIC);
  });
});

describe("canViewContent", () => {
  const privateStudent = {
    id: "student-1",
    role: UserRole.STUDENT,
    profileVisibility: ProfileVisibility.PRIVATE,
  };

  it("allows self", async () => {
    await expect(
      canViewContent({
        viewerId: "student-1",
        author: privateStudent,
        isFollowing: false,
      }),
    ).resolves.toBe(true);
  });

  it("blocks strangers from private students", async () => {
    await expect(
      canViewContent({
        viewerId: "other",
        author: privateStudent,
        isFollowing: false,
      }),
    ).resolves.toBe(false);
  });

  it("allows approved followers", async () => {
    await expect(
      canViewContent({
        viewerId: "friend",
        author: privateStudent,
        isFollowing: true,
      }),
    ).resolves.toBe(true);
  });

  it("allows anyone for trainers", async () => {
    await expect(
      canViewContent({
        viewerId: "anyone",
        author: {
          id: "trainer-1",
          role: UserRole.TRAINER,
          profileVisibility: ProfileVisibility.PRIVATE,
        },
        isFollowing: false,
      }),
    ).resolves.toBe(true);
  });
});
