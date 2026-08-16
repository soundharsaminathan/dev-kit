import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  AgeRange,
  AttendanceStatus,
  BookingStatus,
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
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    batchEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "batch-1" }]),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
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
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => null),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([]);
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
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

  it("completes onboarding without scheduleVibe", async () => {
    const row = makeUser({ scheduleVibe: [] });
    const completed = makeUser({
      scheduleVibe: [],
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

  it("creates a trial booking from a selected session during onboarding", async () => {
    const row = makeUser();
    const completed = makeUser({
      onboardingCompletedAt: new Date("2026-07-22T00:00:00.000Z"),
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      batchId: "batch-1",
      startsAt: new Date("2099-07-24T10:00:00.000Z"),
      endsAt: new Date("2099-07-24T11:00:00.000Z"),
      status: "SCHEDULED",
      type: "REGULAR",
      batch: { id: "batch-1", studioId: "studio-seed-1", active: true },
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-seed-1",
      active: true,
      capacity: 10,
    });
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-1" });
    prisma.booking.create.mockResolvedValue({ id: "booking-trial" });
    prisma.user.update.mockResolvedValue(completed);

    await service.completeOnboarding("student-1", {
      sessionId: "session-1",
      trainerId: "trainer-1",
    });

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        studioId: "studio-seed-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
        sessionId: "session-1",
        trainerId: "trainer-1",
        status: "PENDING",
      },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("creates a personal trial booking without a session", async () => {
    const row = makeUser();
    const completed = makeUser({
      onboardingCompletedAt: new Date("2026-07-22T00:00:00.000Z"),
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-1" });
    prisma.booking.create.mockResolvedValue({ id: "booking-personal" });
    prisma.user.update.mockResolvedValue(completed);

    await service.completeOnboarding("student-1", {
      personalTrial: true,
      trainerId: "trainer-1",
    });

    expect(prisma.session.findUnique).not.toHaveBeenCalled();
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        studioId: "studio-seed-1",
        studentId: "student-1",
        type: "TRIAL",
        trainerId: "trainer-1",
        startsAt: undefined,
        endsAt: undefined,
        notes: "Personal trial — studio will call to confirm a time",
        status: "PENDING",
      },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("creates a timed personal trial with preferred startsAt and endsAt", async () => {
    const row = makeUser();
    const completed = makeUser({
      onboardingCompletedAt: new Date("2026-07-22T00:00:00.000Z"),
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-5" });
    prisma.booking.create.mockResolvedValue({ id: "booking-timed" });
    prisma.user.update.mockResolvedValue(completed);

    await service.completeOnboarding("student-1", {
      trainerId: "trainer-5",
      startsAt: "2026-07-25T15:00:00.000Z",
      endsAt: "2026-07-25T16:00:00.000Z",
    });

    expect(prisma.session.findUnique).not.toHaveBeenCalled();
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        studioId: "studio-seed-1",
        studentId: "student-1",
        type: "TRIAL",
        trainerId: "trainer-5",
        startsAt: new Date("2026-07-25T15:00:00.000Z"),
        endsAt: new Date("2026-07-25T16:00:00.000Z"),
        notes: "Personal trial — preferred time requested",
        status: "PENDING",
      },
    });
  });

  it("creates a trial booking from a regular upcoming session during onboarding", async () => {
    const row = makeUser();
    const completed = makeUser({
      onboardingCompletedAt: new Date("2026-07-22T00:00:00.000Z"),
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.session.findUnique.mockResolvedValue({
      id: "session-regular",
      batchId: "batch-1",
      startsAt: new Date("2099-07-24T10:00:00.000Z"),
      endsAt: new Date("2099-07-24T11:00:00.000Z"),
      status: "SCHEDULED",
      type: "REGULAR",
      batch: { id: "batch-1", studioId: "studio-seed-1", active: true },
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-seed-1",
      active: true,
      capacity: 10,
    });
    prisma.booking.create.mockResolvedValue({ id: "booking-regular" });
    prisma.user.update.mockResolvedValue(completed);

    await service.completeOnboarding("student-1", {
      sessionId: "session-regular",
    });

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        studioId: "studio-seed-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
        sessionId: "session-regular",
        trainerId: undefined,
        status: "PENDING",
      },
    });
    expect(prisma.user.update).toHaveBeenCalled();
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

  it("keeps the existing email when resealing PII on profile patch", async () => {
    const row = makeUser();
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockReturnValue({ ...row, ...MASTER_PII });
    crypto.sealPii.mockReturnValue({
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
      emailHash: "hash",
    });
    prisma.user.update.mockResolvedValue(row);

    await service.updateProfile("student-1", UserRole.STUDENT, {
      name: "Alex Updated",
      phone: "555-0100",
    });

    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({
        email: MASTER_PII.email,
        name: "Alex Updated",
        phone: "555-0100",
      }),
      row.encryptedKey,
    );
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
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    familyMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    parentChild: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
    hashEmail: vi.fn(() => "hash-child"),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
    resolveObjectKey: vi.fn((value: string) => value),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => null),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
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
      {
        name: "Sam Kid",
        kind: FamilyMemberKind.KID,
        gender: Gender.FEMALE,
        ageRange: AgeRange.UNDER_10,
      },
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gender: Gender.FEMALE,
          ageRange: AgeRange.UNDER_10,
        }),
      }),
    );
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

  it("links an existing student by email for a parent", async () => {
    const child = makeUser({
      id: "student-1",
      role: UserRole.STUDENT,
      studioId: "studio-1",
    });
    const parentUser = makeUser({
      id: "parent-1",
      role: UserRole.PARENT,
      studioId: "studio-1",
    });
    prisma.user.findFirst.mockResolvedValue(child);
    prisma.user.findUnique
      .mockResolvedValueOnce(parentUser)
      .mockResolvedValueOnce(child);
    prisma.parentChild.upsert.mockResolvedValue({
      parentUserId: "parent-1",
      childUserId: "student-1",
    });
    crypto.decryptUser.mockReturnValue({
      ...child,
      email: "kid@stepup.dev",
      name: "Kid One",
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const result = await service.linkChildByEmail(
      {
        id: "parent-1",
        role: UserRole.PARENT,
        studioId: "studio-1",
      } as never,
      "kid@stepup.dev",
    );

    expect(crypto.hashEmail).toHaveBeenCalledWith("kid@stepup.dev");
    expect(prisma.parentChild.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          parentUserId_childUserId: {
            parentUserId: "parent-1",
            childUserId: "student-1",
          },
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: "student-1", name: "Kid One" }),
    );
  });

  it("links selected studio users into one family under a parent owner", async () => {
    const anchor = {
      id: "student-1",
      role: UserRole.STUDENT,
      studioId: "studio-1",
    };
    const sibling = {
      id: "student-2",
      role: UserRole.STUDENT,
      studioId: "studio-1",
    };
    const parent = {
      id: "parent-1",
      role: UserRole.PARENT,
      studioId: "studio-1",
    };
    prisma.user.findMany.mockResolvedValue([anchor, sibling, parent]);
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        parentChild: { upsert: prisma.parentChild.upsert },
        familyMember: { upsert: prisma.familyMember.upsert },
      }),
    );
    prisma.parentChild.upsert.mockResolvedValue({});
    prisma.familyMember.upsert.mockResolvedValue({});
    prisma.familyMember.findMany.mockResolvedValue([]);
    prisma.parentChild.findMany.mockResolvedValue([]);

    await service.linkStudioFamily("studio-1", {
      anchorUserId: "student-1",
      memberUserIds: ["student-2", "parent-1"],
    });

    expect(prisma.parentChild.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.familyMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ownerUserId: "parent-1",
          memberUserId: "student-1",
          kind: FamilyMemberKind.KID,
        }),
      }),
    );
    expect(prisma.familyMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ownerUserId: "parent-1",
          memberUserId: "student-2",
          kind: FamilyMemberKind.KID,
        }),
      }),
    );
  });

  it("rejects staff accounts when linking a studio family", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "student-1", role: UserRole.STUDENT, studioId: "studio-1" },
      { id: "staff-1", role: UserRole.STAFF, studioId: "studio-1" },
    ]);

    await expect(
      service.linkStudioFamily("studio-1", {
        anchorUserId: "student-1",
        memberUserIds: ["staff-1"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects empty family member selection", async () => {
    await expect(
      service.linkStudioFamily("studio-1", {
        anchorUserId: "student-1",
        memberUserIds: ["student-1"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("UsersService.createStudent", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studio: {
      findUnique: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    session: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    batchEnrollment: {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "batch-1" }]),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const crypto = {
    decryptUser: vi.fn((user: Record<string, unknown>) => ({
      ...user,
      email: "new@stepup.dev",
      name: "New Student",
      phone: null,
      bio: null,
      instagramUrl: null,
    })),
    sealPii: vi.fn(() => ({
      emailHash: "hash",
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
    })),
    hashEmail: vi.fn(() => "hash"),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => ({ uid: "fb-student-1" })),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    firebase.ensureEmailPasswordUser.mockResolvedValue({
      uid: "fb-student-1",
    });
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  it("creates a student with a shareable temporary password", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: "student-new",
        firebaseUid: "staff-created:abc",
        role: UserRole.STUDENT,
        mustChangePassword: true,
      }),
    );
    prisma.user.update.mockResolvedValue({
      id: "student-new",
      firebaseUid: "fb-student-1",
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-seed-1",
      active: true,
      capacity: 20,
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      batchId: "batch-1",
      studentId: "student-new",
    });

    const result = await service.createStudent({
      studioId: "studio-seed-1",
      name: "New Student",
      email: "new@stepup.dev",
      gender: Gender.FEMALE,
      ageRange: AgeRange.TWENTY_TO_FORTY,
      styles: ["Hip Hop"],
      batchId: "batch-1",
      temporaryPassword: "TempPass1",
    });

    expect(result.id).toBe("student-new");
    expect(result.temporaryPassword).toBe("TempPass1");
    expect(result.setupHint).toMatch(/temporary password/i);
    expect(firebase.ensureEmailPasswordUser).toHaveBeenCalledWith({
      email: "new@stepup.dev",
      password: "TempPass1",
      displayName: "New Student",
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mustChangePassword: true,
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-new" },
      data: { firebaseUid: "fb-student-1" },
    });
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-new" },
      },
      update: expect.objectContaining({ status: "ACTIVE" }),
      create: expect.objectContaining({
        batchId: "batch-1",
        studentId: "student-new",
        status: "ACTIVE",
      }),
    });
  });

  it("rejects enrollment into a batch from another studio", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: "student-new",
        firebaseUid: "staff-created:abc",
        role: UserRole.STUDENT,
        mustChangePassword: true,
      }),
    );
    prisma.user.update.mockResolvedValue({
      id: "student-new",
      firebaseUid: "fb-student-1",
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-other",
      studioId: "studio-other",
      active: true,
      capacity: 20,
    });

    await expect(
      service.createStudent({
        studioId: "studio-seed-1",
        name: "New Student",
        email: "new@stepup.dev",
        gender: Gender.FEMALE,
        ageRange: AgeRange.TWENTY_TO_FORTY,
        batchId: "batch-other",
        temporaryPassword: "TempPass1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enrolls a new student into a batch", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: "student-new",
        firebaseUid: "staff-created:abc",
        role: UserRole.STUDENT,
        mustChangePassword: true,
      }),
    );
    prisma.user.update.mockResolvedValue({
      id: "student-new",
      firebaseUid: "fb-student-1",
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-seed-1",
      active: true,
      capacity: 20,
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      batchId: "batch-1",
      studentId: "student-new",
    });

    await service.createStudent({
      studioId: "studio-seed-1",
      name: "New Student",
      email: "new@stepup.dev",
      gender: Gender.FEMALE,
      ageRange: AgeRange.TWENTY_TO_FORTY,
      styles: ["Hip Hop"],
      batchId: "batch-1",
      temporaryPassword: "TempPass1",
    });

    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-new" },
      },
      update: expect.objectContaining({ status: "ACTIVE" }),
      create: expect.objectContaining({
        batchId: "batch-1",
        studentId: "student-new",
        status: "ACTIVE",
      }),
    });
  });

  it("resets a student temporary password", async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(
        makeUser({
          id: "student-1",
          firebaseUid: "fb-student-1",
          role: UserRole.STUDENT,
        }),
      )
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue({ id: "student-1" });

    const result = await service.resetStudentTemporaryPassword(
      "studio-seed-1",
      "student-1",
      "ResetPass1",
    );

    expect(result.temporaryPassword).toBe("ResetPass1");
    expect(result.email).toBe("new@stepup.dev");
    expect(firebase.ensureEmailPasswordUser).toHaveBeenCalledWith({
      email: "new@stepup.dev",
      password: "ResetPass1",
      displayName: "New Student",
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { mustChangePassword: true },
    });
  });

  it("resets a trainer temporary password", async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(
        makeUser({
          id: "trainer-1",
          firebaseUid: "fb-trainer-1",
          role: UserRole.TRAINER,
        }),
      )
      .mockResolvedValueOnce(null);
    crypto.decryptUser.mockImplementation((user: Record<string, unknown>) => ({
      ...user,
      email: "trainer@stepup.dev",
      name: "Studio Trainer",
      phone: null,
      bio: null,
      instagramUrl: null,
    }));
    prisma.user.update.mockResolvedValue({ id: "trainer-1" });

    const result = await service.resetTrainerTemporaryPassword(
      "studio-seed-1",
      "trainer-1",
      "TrainerPass1",
    );

    expect(result.temporaryPassword).toBe("TrainerPass1");
    expect(result.email).toBe("trainer@stepup.dev");
    expect(firebase.ensureEmailPasswordUser).toHaveBeenCalledWith({
      email: "trainer@stepup.dev",
      password: "TrainerPass1",
      displayName: "Studio Trainer",
    });
  });

  it("resets an owner temporary password", async () => {
    prisma.studio.findUnique.mockResolvedValue({
      id: "studio-seed-1",
      owner: makeUser({
        id: "owner-1",
        firebaseUid: "fb-owner-1",
        role: UserRole.OWNER,
      }),
    });
    crypto.decryptUser.mockImplementation((user: Record<string, unknown>) => ({
      ...user,
      email: "owner@stepup.dev",
      name: "Studio Owner",
      phone: null,
      bio: null,
      instagramUrl: null,
    }));
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ id: "owner-1" });

    const result = await service.resetOwnerTemporaryPassword(
      "studio-seed-1",
      "OwnerPass1",
    );

    expect(result.temporaryPassword).toBe("OwnerPass1");
    expect(result.email).toBe("owner@stepup.dev");
    expect(firebase.ensureEmailPasswordUser).toHaveBeenCalledWith({
      email: "owner@stepup.dev",
      password: "OwnerPass1",
      displayName: "Studio Owner",
    });
  });
});

describe("UsersService.updateStudioStudent", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    batchEnrollment: { findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    attendance: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    parentChild: { findMany: vi.fn() },
    familyMember: { findMany: vi.fn() },
  };
  const crypto = {
    decryptUser: vi.fn((user: Record<string, unknown>) => ({
      ...user,
      email: "a@b.com",
      name: "Ada",
      phone: null,
      bio: null,
      instagramUrl: null,
    })),
    sealPii: vi.fn(() => ({
      piiCiphertext: "c",
      piiIv: "iv",
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
    resolveObjectKey: vi.fn((value: string) => value),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => null),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  it("updates active flag for a studio student", async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: "student-1",
        studioId: "studio-seed-1",
        role: UserRole.STUDENT,
      })
      .mockResolvedValueOnce({
        id: "student-1",
        role: UserRole.STUDENT,
        photoUrl: null,
        styles: [],
        active: false,
        encryptedKey: "k",
        piiCiphertext: "c",
        piiIv: "iv",
      });
    prisma.user.update.mockResolvedValue({ id: "student-1", active: false });
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.membership.findMany.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.parentChild.findMany.mockResolvedValue([]);
    prisma.familyMember.findMany.mockResolvedValue([]);

    const result = await service.updateStudioStudent(
      "studio-seed-1",
      "student-1",
      { active: false },
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { active: false },
    });
    expect(result.student.active).toBe(false);
    expect(result.parents).toEqual([]);
    expect(result.family).toEqual([]);
  });

  it("rejects when no fields are provided", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "student-1",
      studioId: "studio-seed-1",
      role: UserRole.STUDENT,
    });

    await expect(
      service.updateStudioStudent("studio-seed-1", "student-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("UsersService.deleteStudent", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    attendance: {
      count: vi.fn(),
    },
    contestEntry: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const crypto = {
    decryptUser: vi.fn((user: Record<string, unknown>) => user),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => null),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  it("deletes a studio student and clears contest entries they registered", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "student-1" });
    prisma.attendance.count.mockResolvedValue(0);
    prisma.contestEntry.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.delete.mockResolvedValue({ id: "student-1" });

    const result = await service.deleteStudent("studio-seed-1", "student-1");

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        studioId: "studio-seed-1",
        role: UserRole.STUDENT,
      },
      select: { id: true },
    });
    expect(prisma.contestEntry.deleteMany).toHaveBeenCalledWith({
      where: { registeredById: "student-1" },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "student-1" },
    });
    expect(result).toEqual({ deleted: true, id: "student-1" });
  });

  it("rejects when the student is not in the studio", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteStudent("studio-seed-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("rejects when the student has marked attendance", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "student-1" });
    prisma.attendance.count.mockResolvedValue(2);

    await expect(
      service.deleteStudent("studio-seed-1", "student-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});

describe("UsersService.createStudents", () => {
  const prisma = {
    user: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  };
  const crypto = {
    sealPii: vi.fn((pii: { email: string; name: string }) => ({
      emailHash: `hash:${pii.email}`,
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
    })),
    hashEmail: vi.fn((email: string) => `hash:${email}`),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  it("assigns age-range labels from exact ages", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.createMany.mockResolvedValue({ count: 4 });

    await service.createStudents("studio-seed-1", [
      {
        name: "Kid",
        email: "kid@example.com",
        gender: Gender.FEMALE,
        age: 8,
      },
      {
        name: "Teen",
        email: "teen@example.com",
        gender: Gender.MALE,
        age: 16,
      },
      {
        name: "Adult",
        email: "adult@example.com",
        gender: Gender.FEMALE,
        age: 28,
      },
      {
        name: "Master",
        email: "master@example.com",
        gender: Gender.MALE,
        age: 45,
      },
    ]);

    expect(prisma.user.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          ageRange: AgeRange.UNDER_10,
        }),
        expect.objectContaining({
          ageRange: AgeRange.TEN_TO_TWENTY,
        }),
        expect.objectContaining({
          ageRange: AgeRange.TWENTY_TO_FORTY,
        }),
        expect.objectContaining({
          ageRange: AgeRange.FORTY_PLUS,
        }),
      ],
    });
  });

  it("creates students with required gender and age range", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.createMany.mockResolvedValue({ count: 1 });

    const result = await service.createStudents("studio-seed-1", [
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: Gender.FEMALE,
        age: 28,
      },
    ]);

    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(prisma.user.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          role: UserRole.STUDENT,
          studioId: "studio-seed-1",
          gender: Gender.FEMALE,
          ageRange: AgeRange.TWENTY_TO_FORTY,
          styles: [],
          profileVisibility: ProfileVisibility.PRIVATE,
        }),
      ],
    });
    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        name: "Ada Lovelace",
        phone: null,
      }),
    );
  });

  it("seals an imported mobile number", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.createMany.mockResolvedValue({ count: 1 });

    await service.createStudents("studio-seed-1", [
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: Gender.FEMALE,
        age: 28,
        phone: " +91 91234 56789 ",
      },
    ]);

    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        name: "Ada Lovelace",
        phone: "+91 91234 56789",
      }),
    );
  });

  it("skips emails that already exist in the studio", async () => {
    prisma.user.findMany.mockResolvedValue([
      { emailHash: "hash:ada@example.com" },
    ]);

    const result = await service.createStudents("studio-seed-1", [
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: Gender.FEMALE,
        age: 28,
      },
      {
        name: "Alan Turing",
        email: "alan@example.com",
        gender: Gender.MALE,
        age: 16,
      },
    ]);

    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(prisma.user.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          gender: Gender.MALE,
          ageRange: AgeRange.TEN_TO_TWENTY,
        }),
      ],
    });
  });
});

describe("UsersService lead remarks", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
    },
    leadRemark: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      ...user,
      email: "staff@stepup.dev",
      name: "Staff Member",
      phone: null,
      bio: null,
      instagramUrl: null,
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
  };
  const firebase = {};

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  it("rejects an empty remark body", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "lead-1" });

    await expect(
      service.addLeadRemark("studio-1", "lead-1", "staff-1", "   "),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists remarks oldest first", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "lead-1" });
    prisma.leadRemark.findMany.mockResolvedValue([
      {
        id: "r-1",
        body: "Called, no answer",
        createdAt: new Date("2026-08-10T10:00:00.000Z"),
        author: {
          id: "staff-1",
          encryptedKey: "k",
          piiCiphertext: "c",
          piiIv: "iv",
        },
      },
      {
        id: "r-2",
        body: "Will visit Saturday",
        createdAt: new Date("2026-08-12T10:00:00.000Z"),
        author: {
          id: "staff-1",
          encryptedKey: "k",
          piiCiphertext: "c",
          piiIv: "iv",
        },
      },
    ]);

    const remarks = await service.listLeadRemarks("studio-1", "lead-1");

    expect(prisma.leadRemark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studioId: "studio-1", studentId: "lead-1" },
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(remarks.map((row) => row.body)).toEqual([
      "Called, no answer",
      "Will visit Saturday",
    ]);
    expect(remarks[0]?.author).toEqual({
      id: "staff-1",
      name: "Staff Member",
    });
  });

  it("creates a remark and returns the author", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "lead-1" });
    prisma.leadRemark.create.mockResolvedValue({
      id: "r-1",
      body: "Left a voicemail",
      createdAt: new Date("2026-08-15T10:00:00.000Z"),
      author: {
        id: "staff-1",
        encryptedKey: "k",
        piiCiphertext: "c",
        piiIv: "iv",
      },
    });

    const remark = await service.addLeadRemark(
      "studio-1",
      "lead-1",
      "staff-1",
      "  Left a voicemail  ",
    );

    expect(prisma.leadRemark.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          studioId: "studio-1",
          studentId: "lead-1",
          authorId: "staff-1",
          body: "Left a voicemail",
        },
      }),
    );
    expect(remark.body).toBe("Left a voicemail");
    expect(remark.author.name).toBe("Staff Member");
  });

  it("rejects remarks for a missing studio student", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.listLeadRemarks("studio-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("UsersService listLeads sections", () => {
  const prisma = {
    user: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    leadRemark: { groupBy: vi.fn() },
  };
  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      ...user,
      email: `${user.id}@stepup.dev`,
      name: `Student ${user.id}`,
      phone: "9000000000",
      bio: null,
      instagramUrl: null,
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (value: string | null) => value),
  };
  const firebase = {};

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.leadRemark.groupBy.mockResolvedValue([]);
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
      firebase as never,
    );
  });

  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const futureKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
  const pastKey = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;

  function studentRow(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      active: true,
      ageRange: AgeRange.TWENTY_TO_FORTY,
      photoUrl: null,
      encryptedKey: "k",
      piiCiphertext: "c",
      piiIv: "iv",
      batchEnrollments: [],
      attendanceRecords: [],
      ...overrides,
    };
  }

  function enrollmentRow(status: string, batchActive = true) {
    return {
      status,
      batch: {
        id: "batch-1",
        active: batchActive,
        sessions: [{ status: "SCHEDULED" }],
      },
    };
  }

  function bookingRow(
    studentId: string,
    sessionStartsAt: Date,
    status: BookingStatus = BookingStatus.CONFIRMED,
  ) {
    return {
      id: `bk-${studentId}`,
      studentId,
      status,
      sessionId: "s-1",
      startsAt: null,
      session: {
        startsAt: sessionStartsAt,
        batch: { name: "Trial Batch" },
      },
      batch: null,
    };
  }

  it("returns only the requested section as a flat page", async () => {
    prisma.user.findMany.mockResolvedValue([
      studentRow("student-new"),
      studentRow("student-booked"),
      studentRow("student-left", {
        batchEnrollments: [enrollmentRow("LEFT")],
      }),
      studentRow("student-archived", { active: false }),
    ]);
    prisma.booking.findMany.mockResolvedValue([
      bookingRow("student-booked", future),
    ]);

    const page = await service.listLeads("studio-1", { section: "left" });

    expect(page.items.map((row) => row.id)).toEqual(["student-left"]);
    expect(page.items[0]?.section).toBe("left");
  });

  it("ignores the date range on new, left and archived sections", async () => {
    prisma.user.findMany.mockResolvedValue([
      studentRow("student-new"),
      studentRow("student-left", {
        batchEnrollments: [enrollmentRow("LEFT")],
      }),
      studentRow("student-archived", { active: false }),
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    for (const section of ["new", "left", "archived"] as const) {
      const page = await service.listLeads("studio-1", {
        section,
        from: pastKey,
        to: pastKey,
      });
      expect(page.items.map((row) => row.id)).toEqual([
        section === "new"
          ? "student-new"
          : section === "left"
            ? "student-left"
            : "student-archived",
      ]);
    }
  });

  it("filters the trial booked section by the upcoming session date", async () => {
    prisma.user.findMany.mockResolvedValue([studentRow("student-booked")]);
    prisma.booking.findMany.mockResolvedValue([
      bookingRow("student-booked", future),
    ]);

    const inRange = await service.listLeads("studio-1", {
      section: "trialBooked",
      from: futureKey,
      to: futureKey,
    });
    expect(inRange.items.map((row) => row.id)).toEqual(["student-booked"]);
    expect(inRange.items[0]?.trialBooking?.sessionStartsAt).toBe(
      future.toISOString(),
    );

    const outOfRange = await service.listLeads("studio-1", {
      section: "trialBooked",
      from: pastKey,
      to: pastKey,
    });
    expect(outOfRange.items).toEqual([]);
  });

  it("filters attended, missed and converted by the relevant trial date", async () => {
    prisma.user.findMany.mockResolvedValue([
      studentRow("student-attended", {
        attendanceRecords: [
          { sessionId: "s-1", status: AttendanceStatus.PRESENT },
        ],
      }),
      studentRow("student-missed"),
      studentRow("student-converted", {
        batchEnrollments: [enrollmentRow("ACTIVE")],
      }),
    ]);
    prisma.booking.findMany.mockResolvedValue([
      bookingRow("student-attended", past, BookingStatus.CONFIRMED),
      bookingRow("student-missed", past, BookingStatus.PENDING),
      bookingRow("student-converted", past, BookingStatus.COMPLETED),
    ]);

    const attended = await service.listLeads("studio-1", {
      section: "trialAttended",
      from: pastKey,
      to: pastKey,
    });
    expect(attended.items.map((row) => row.id)).toEqual(["student-attended"]);

    const missed = await service.listLeads("studio-1", {
      section: "trialMissed",
      from: pastKey,
      to: pastKey,
    });
    expect(missed.items.map((row) => row.id)).toEqual(["student-missed"]);

    const converted = await service.listLeads("studio-1", {
      section: "converted",
      from: pastKey,
      to: pastKey,
    });
    expect(converted.items.map((row) => row.id)).toEqual(["student-converted"]);

    const outOfRange = await service.listLeads("studio-1", {
      section: "trialAttended",
      from: futureKey,
      to: futureKey,
    });
    expect(outOfRange.items).toEqual([]);
  });

  it("classifies attended and missed into their own sections", async () => {
    prisma.user.findMany.mockResolvedValue([
      studentRow("student-attended", {
        attendanceRecords: [
          { sessionId: "s-1", status: AttendanceStatus.PRESENT },
        ],
      }),
      studentRow("student-missed"),
    ]);
    prisma.booking.findMany.mockResolvedValue([
      bookingRow("student-attended", past, BookingStatus.CONFIRMED),
      bookingRow("student-missed", past, BookingStatus.PENDING),
    ]);

    const attended = await service.listLeads("studio-1", {
      section: "trialAttended",
    });
    expect(attended.items.map((row) => row.id)).toEqual(["student-attended"]);

    const missed = await service.listLeads("studio-1", {
      section: "trialMissed",
    });
    expect(missed.items.map((row) => row.id)).toEqual(["student-missed"]);
  });
});
