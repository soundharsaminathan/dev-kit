import { ProfileVisibility, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canViewContent,
  effectiveProfileVisibility,
  isSameStudio,
} from "./visibility";

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

describe("isSameStudio", () => {
  it("requires matching non-null studio ids", () => {
    expect(isSameStudio("a", "a")).toBe(true);
    expect(isSameStudio("a", "b")).toBe(false);
    expect(isSameStudio(null, "a")).toBe(false);
    expect(isSameStudio(undefined, undefined)).toBe(false);
  });
});

describe("canViewContent", () => {
  const privateStudent = {
    id: "student-1",
    role: UserRole.STUDENT,
    profileVisibility: ProfileVisibility.PRIVATE,
    studioId: "studio-1",
  };

  it("allows self across studios", async () => {
    await expect(
      canViewContent({
        viewerId: "student-1",
        viewerStudioId: "studio-2",
        author: privateStudent,
        isFollowing: false,
      }),
    ).resolves.toBe(true);
  });

  it("blocks strangers from private students", async () => {
    await expect(
      canViewContent({
        viewerId: "other",
        viewerStudioId: "studio-1",
        author: privateStudent,
        isFollowing: false,
      }),
    ).resolves.toBe(false);
  });

  it("allows approved followers in the same studio", async () => {
    await expect(
      canViewContent({
        viewerId: "friend",
        viewerStudioId: "studio-1",
        author: privateStudent,
        isFollowing: true,
      }),
    ).resolves.toBe(true);
  });

  it("blocks cross-studio trainers even when public within studio", async () => {
    await expect(
      canViewContent({
        viewerId: "anyone",
        viewerStudioId: "studio-2",
        author: {
          id: "trainer-1",
          role: UserRole.TRAINER,
          profileVisibility: ProfileVisibility.PRIVATE,
          studioId: "studio-1",
        },
        isFollowing: false,
      }),
    ).resolves.toBe(false);
  });

  it("allows same-studio trainers", async () => {
    await expect(
      canViewContent({
        viewerId: "anyone",
        viewerStudioId: "studio-1",
        author: {
          id: "trainer-1",
          role: UserRole.TRAINER,
          profileVisibility: ProfileVisibility.PRIVATE,
          studioId: "studio-1",
        },
        isFollowing: false,
      }),
    ).resolves.toBe(true);
  });
});
