import { BadRequestException } from "@nestjs/common";
import { ExperienceLevel, ProfileVisibility, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersService } from "./users.service";

const MASTER_PII = {
  email: "alex@stepup.dev",
  name: "Alex Student",
  phone: null,
  bio: null,
  instagramUrl: null,
};

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "student-1",
    firebaseUid: "fb-1",
    encryptedKey: "key",
    piiCiphertext: "cipher",
    piiIv: "iv",
    emailHash: "hash",
    role: UserRole.STUDENT,
    photoUrl: null,
    bannerUrl: null,
    coverUrl: null,
    styles: ["Hip Hop"],
    experienceLevel: ExperienceLevel.BEGINNER,
    scheduleVibe: ["weekends"],
    preferredBranchId: "branch-main-1",
    onboardingCompletedAt: null,
    profileVisibility: ProfileVisibility.PRIVATE,
    studioId: "studio-seed-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("UsersService onboarding", () => {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    studioBranch: {
      findFirst: vi.fn(),
    },
  };
  const crypto = {
    decryptUser: vi.fn(),
    sealPii: vi.fn(),
    hashEmail: vi.fn(),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
    resolveObjectKey: vi.fn((value: string) => value),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
    );
  });

  it("rejects completeOnboarding when required prefs are missing", async () => {
    const row = makeUser({
      styles: [],
      experienceLevel: null,
      scheduleVibe: [],
      preferredBranchId: null,
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockReturnValue({
      ...row,
      ...MASTER_PII,
      name: "New User",
      styles: [],
      experienceLevel: null,
      scheduleVibe: [],
      preferredBranchId: null,
    });

    await expect(
      service.completeOnboarding("student-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("marks onboarding complete when prefs are present", async () => {
    const row = makeUser();
    const completed = makeUser({
      onboardingCompletedAt: new Date("2026-07-22T00:00:00.000Z"),
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.user.update.mockResolvedValue(completed);

    const result = await service.completeOnboarding("student-1");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
    expect(result.onboardingCompletedAt).toEqual(
      completed.onboardingCompletedAt,
    );
  });

  it("updates preference fields on profile patch", async () => {
    const row = makeUser({
      styles: [],
      experienceLevel: null,
      scheduleVibe: [],
      preferredBranchId: null,
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockReturnValue({ ...row, ...MASTER_PII });
    prisma.studioBranch.findFirst.mockResolvedValue({ id: "branch-main-1" });
    prisma.user.update.mockResolvedValue(
      makeUser({
        styles: ["Hip Hop"],
        experienceLevel: ExperienceLevel.BEGINNER,
        scheduleVibe: ["weekday_evenings"],
        preferredBranchId: "branch-main-1",
      }),
    );

    await service.updateProfile("student-1", UserRole.STUDENT, {
      styles: ["Hip Hop"],
      experienceLevel: ExperienceLevel.BEGINNER,
      scheduleVibe: ["weekday_evenings"],
      preferredBranchId: "branch-main-1",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: expect.objectContaining({
        styles: ["Hip Hop"],
        experienceLevel: ExperienceLevel.BEGINNER,
        scheduleVibe: ["weekday_evenings"],
        preferredBranchId: "branch-main-1",
      }),
    });
  });

  it("rejects an unknown preferred branch", async () => {
    const row = makeUser({ preferredBranchId: null });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockReturnValue({ ...row, ...MASTER_PII });
    prisma.studioBranch.findFirst.mockResolvedValue(null);

    await expect(
      service.updateProfile("student-1", UserRole.STUDENT, {
        preferredBranchId: "missing-branch",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
