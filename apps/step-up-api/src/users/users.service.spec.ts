import { BadRequestException } from "@nestjs/common";
import {
  AgeRange,
  ExperienceLevel,
  FamilyMemberKind,
  Gender,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
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
    gender: Gender.FEMALE,
    ageRange: AgeRange.TWENTY_TO_FORTY,
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
      gender: null,
      ageRange: null,
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
      gender: null,
      ageRange: null,
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
      gender: null,
      ageRange: null,
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
        gender: Gender.FEMALE,
        ageRange: AgeRange.TEN_TO_TWENTY,
        preferredBranchId: "branch-main-1",
      }),
    );

    await service.updateProfile("student-1", UserRole.STUDENT, {
      styles: ["Hip Hop"],
      experienceLevel: ExperienceLevel.BEGINNER,
      scheduleVibe: ["weekday_evenings"],
      gender: Gender.FEMALE,
      ageRange: AgeRange.TEN_TO_TWENTY,
      preferredBranchId: "branch-main-1",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: expect.objectContaining({
        styles: ["Hip Hop"],
        experienceLevel: ExperienceLevel.BEGINNER,
        scheduleVibe: ["weekday_evenings"],
        gender: Gender.FEMALE,
        ageRange: AgeRange.TEN_TO_TWENTY,
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

describe("UsersService family members", () => {
  const prisma = {
    user: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    familyMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    parentChild: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    membershipCoveredStudent: {
      count: vi.fn(),
    },
    batchEnrollment: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const crypto = {
    decryptUser: vi.fn((user: ReturnType<typeof makeUser>) => ({
      ...user,
      email: "dependent@internal.invalid",
      name: user.id === "kid-1" ? "Kid One" : "Alex Student",
      phone: null,
      bio: null,
      instagramUrl: null,
    })),
    sealPii: vi.fn(() => ({
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
      emailHash: "hash-dep",
    })),
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

  it("lists family members and legacy parent-child kids", async () => {
    prisma.familyMember.findMany.mockResolvedValue([
      {
        memberUserId: "co-1",
        kind: FamilyMemberKind.CO_STUDENT,
        member: makeUser({
          id: "co-1",
          firebaseUid: "dependent:co-1",
        }),
      },
    ]);
    prisma.parentChild.findMany.mockResolvedValue([
      {
        childUserId: "kid-1",
        child: makeUser({
          id: "kid-1",
          firebaseUid: "fb-kid",
        }),
      },
    ]);
    crypto.decryptUser.mockImplementation(
      (user: ReturnType<typeof makeUser>) => ({
        ...user,
        email: "x@y.z",
        name: user.id === "kid-1" ? "Kid One" : "Co Student",
        phone: null,
        bio: null,
        instagramUrl: null,
      }),
    );

    const result = await service.listFamilyMembers("owner-1");

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "co-1",
          kind: FamilyMemberKind.CO_STUDENT,
          isDependent: true,
        }),
        expect.objectContaining({
          id: "kid-1",
          kind: FamilyMemberKind.KID,
          isDependent: false,
        }),
      ]),
    );
  });

  it("creates a dependent family member", async () => {
    const created = makeUser({
      id: "dep-1",
      firebaseUid: "dependent:abc",
    });
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.user.create.mockResolvedValue(created);
        prisma.familyMember.create.mockResolvedValue({
          ownerUserId: "owner-1",
          memberUserId: "dep-1",
          kind: FamilyMemberKind.KID,
        });
        return fn(prisma);
      },
    );
    crypto.decryptUser.mockReturnValue({
      ...created,
      email: "dependent+abc@internal.invalid",
      name: "Sam Kid",
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const result = await service.createFamilyMember(
      {
        id: "owner-1",
        studioId: "studio-seed-1",
        role: UserRole.STUDENT,
      } as never,
      { name: "Sam Kid", kind: FamilyMemberKind.KID },
    );

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.familyMember.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: "owner-1",
        memberUserId: "dep-1",
        kind: FamilyMemberKind.KID,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "dep-1",
        name: "Sam Kid",
        kind: FamilyMemberKind.KID,
        isDependent: true,
      }),
    );
  });

  it("unlinks and deletes unused dependent", async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      memberUserId: "dep-1",
      member: makeUser({ id: "dep-1", firebaseUid: "dependent:abc" }),
    });
    prisma.familyMember.delete.mockResolvedValue({});
    prisma.familyMember.count.mockResolvedValue(0);
    prisma.parentChild.count.mockResolvedValue(0);
    prisma.membershipCoveredStudent.count.mockResolvedValue(0);
    prisma.batchEnrollment.count.mockResolvedValue(0);
    prisma.user.delete.mockResolvedValue({});

    const result = await service.removeFamilyMember("owner-1", "dep-1");

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "dep-1" } });
    expect(result).toEqual({ removed: true, deletedDependent: true });
  });
});
