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
    session: {
      findUnique: vi.fn(),
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

  it("creates a trial booking without schedule conflict checks", async () => {
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
      startsAt: new Date("2026-07-24T10:00:00.000Z"),
      endsAt: new Date("2026-07-24T11:00:00.000Z"),
      status: "SCHEDULED",
      type: "TRIAL",
      batch: { id: "batch-1", studioId: "studio-seed-1" },
    });
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-seed-1",
      capacity: 10,
    });
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-1" });
    prisma.booking.create.mockResolvedValue({ id: "booking-1" });
    prisma.user.update.mockResolvedValue(completed);

    await service.completeOnboarding("student-1", {
      sessionId: "session-1",
      trainerId: "trainer-1",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studioId: "studio-seed-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
        sessionId: "session-1",
        trainerId: "trainer-1",
        status: "PENDING",
      }),
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

  it("rejects onboarding trial for a regular session", async () => {
    const row = makeUser();
    prisma.user.findUniqueOrThrow.mockResolvedValue(row);
    crypto.decryptUser.mockImplementation((user: typeof row) => ({
      ...user,
      ...MASTER_PII,
    }));
    prisma.session.findUnique.mockResolvedValue({
      id: "session-regular",
      batchId: "batch-1",
      startsAt: new Date("2026-07-24T10:00:00.000Z"),
      endsAt: new Date("2026-07-24T11:00:00.000Z"),
      status: "SCHEDULED",
      type: "REGULAR",
      batch: { id: "batch-1", studioId: "studio-seed-1" },
    });

    await expect(
      service.completeOnboarding("student-1", {
        sessionId: "session-regular",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.create).not.toHaveBeenCalled();
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
});

describe("UsersService.createStudent", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
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

  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    service = new UsersService(
      prisma as never,
      crypto as never,
      media as never,
    );
  });

  it("creates a student and optionally enrolls them in a batch", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: "student-new",
        firebaseUid: "staff-created:abc",
        role: UserRole.STUDENT,
      }),
    );
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
    });

    expect(result.id).toBe("student-new");
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-new" },
      },
      update: {},
      create: { batchId: "batch-1", studentId: "student-new" },
    });
  });

  it("rejects enrollment into a batch from another studio", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: "student-new",
        firebaseUid: "staff-created:abc",
        role: UserRole.STUDENT,
      }),
    );
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
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
