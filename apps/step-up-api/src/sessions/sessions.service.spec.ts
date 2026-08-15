import { SessionStatus, SessionType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service";

const baseSchedulePrisma = () => ({
  session: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  batch: {
    findUnique: vi.fn(),
  },
  batchEnrollment: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  user: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
});

const baseScheduleConflicts = () => ({
  assertNoConflicts: vi.fn().mockResolvedValue(undefined),
});

const baseTrialSlotsCache = () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  invalidate: vi.fn().mockResolvedValue(undefined),
});

const baseNotifications = () => ({
  create: vi.fn().mockResolvedValue({ id: "notif-1" }),
});

const baseChat = () => ({
  postBatchSessionCard: vi.fn().mockResolvedValue({ id: "msg-1" }),
});

const baseCrypto = () => ({
  decryptUser: (user: unknown) => user,
});

const ownerActor = {
  id: "owner-1",
  role: "OWNER",
  studioId: "studio-1",
};

const trainerActor = {
  id: "trainer-1",
  role: "TRAINER",
  studioId: "studio-1",
};

function buildService(
  prisma: ReturnType<typeof baseSchedulePrisma>,
  extra: { scheduleConflicts?: unknown; notifications?: unknown } = {},
) {
  return new SessionsService(
    prisma as never,
    (extra.scheduleConflicts ?? baseScheduleConflicts()) as never,
    baseTrialSlotsCache() as never,
    (extra.notifications ?? baseNotifications()) as never,
    baseChat() as never,
    baseCrypto() as never,
  );
}

describe("SessionsService.complete", () => {
  it("rejects completing a non-scheduled session", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [],
      },
    });
    const service = buildService(prisma);

    await expect(
      service.complete(ownerActor as never, "session-1"),
    ).rejects.toThrow(/Only scheduled sessions/);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it("auto-assigns the trainer themselves for TRAINER actors", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-2" }],
      },
    });
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-1" });
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      trainerId: "trainer-1",
      batch: { studioId: "studio-1" },
    });
    const service = buildService(prisma);

    const result = await service.complete(trainerActor as never, "session-1", {
      trainerId: "trainer-2",
    });

    expect(result).toMatchObject({ trainerId: "trainer-1" });
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { status: SessionStatus.COMPLETED, trainerId: "trainer-1" },
      include: { batch: { select: { studioId: true } } },
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "trainer-1", studioId: "studio-1", role: "TRAINER" },
      select: { id: true },
    });
  });

  it("forbids a TRAINER who is not a trainer at the studio", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-2" }],
      },
    });
    prisma.user.findFirst.mockResolvedValue(null);
    const service = buildService(prisma);

    await expect(
      service.complete(trainerActor as never, "session-1"),
    ).rejects.toThrow(/not a trainer/);
  });

  it("defaults OWNER/STAFF to the first batch trainer when no trainerId given", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-2" }],
      },
    });
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-2" });
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      trainerId: "trainer-2",
      batch: { studioId: "studio-1" },
    });
    const service = buildService(prisma);

    const result = await service.complete(ownerActor as never, "session-1");

    expect(result).toMatchObject({ trainerId: "trainer-2" });
  });

  it("honors an explicit trainerId from OWNER/STAFF", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-2" }],
      },
    });
    prisma.user.findFirst.mockResolvedValue({ id: "trainer-9" });
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      trainerId: "trainer-9",
      batch: { studioId: "studio-1" },
    });
    const service = buildService(prisma);

    const result = await service.complete(ownerActor as never, "session-1", {
      trainerId: "trainer-9",
    });

    expect(result).toMatchObject({ trainerId: "trainer-9" });
  });

  it("rejects a trainerId that is not a trainer at this studio", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      batch: {
        id: "batch-1",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-2" }],
      },
    });
    prisma.user.findFirst.mockResolvedValue(null);
    const service = buildService(prisma);

    await expect(
      service.complete(ownerActor as never, "session-1", {
        trainerId: "trainer-99",
      }),
    ).rejects.toThrow(/must belong to this studio/);
  });
});

describe("SessionsService.listIncompletePast", () => {
  it("returns overdue scheduled sessions with first-trainer hint", async () => {
    const prisma = baseSchedulePrisma();
    const startsAt = new Date("2026-07-15T10:00:00.000Z");
    const endsAt = new Date("2026-07-15T11:00:00.000Z");
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-overdue-1",
        startsAt,
        endsAt,
        batch: {
          id: "batch-1",
          name: "Kids Hip-hop",
          trainers: [{ trainerId: "trainer-1" }],
        },
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "trainer-1",
        name: "Alex Trainer",
      },
    ]);
    const service = buildService(prisma);

    const result = await service.listIncompletePast("studio-1");

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SessionStatus.SCHEDULED,
          endsAt: { lt: expect.any(Date) },
          batch: { studioId: "studio-1" },
        }),
      }),
    );
    expect(result).toEqual([
      {
        id: "session-overdue-1",
        batchId: "batch-1",
        batchName: "Kids Hip-hop",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        firstTrainer: { id: "trainer-1", name: "Alex Trainer" },
      },
    ]);
  });

  it("returns null firstTrainer when the batch has no trainers", async () => {
    const prisma = baseSchedulePrisma();
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-overdue-2",
        startsAt: new Date("2026-07-15T10:00:00.000Z"),
        endsAt: new Date("2026-07-15T11:00:00.000Z"),
        batch: {
          id: "batch-2",
          name: "No Trainer Batch",
          trainers: [],
        },
      },
    ]);
    prisma.user.findMany.mockResolvedValue([]);
    const service = buildService(prisma);

    const result = await service.listIncompletePast("studio-1");

    expect(result).toEqual([expect.objectContaining({ firstTrainer: null })]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("SessionsService listTrialSlots", () => {
  const prisma = {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    batchEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
  };

  const trialSlotsCache = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  };

  const notifications = {
    create: vi.fn().mockResolvedValue({ id: "notif-1" }),
  };

  const chat = {
    postBatchSessionCard: vi.fn().mockResolvedValue({ id: "msg-1" }),
  };

  const crypto = {
    decryptUser: (user: unknown) => user,
  };

  let service: SessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    service = new SessionsService(
      prisma as never,
      scheduleConflicts as never,
      trialSlotsCache as never,
      notifications as never,
      chat as never,
      crypto as never,
    );
  });

  it("returns cached trial slots on hit", async () => {
    const cached = [
      {
        sessionId: "session-trial-w0",
        batchId: "batch-trial-1",
        batchName: "Open Beginner Class",
        styleBadge: "Hip-hop",
        startsAt: "2026-07-25T11:00:00.000Z",
        endsAt: "2026-07-25T12:00:00.000Z",
      },
    ];
    trialSlotsCache.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.listTrialSlots("studio-1");

    expect(result).toEqual(cached);
    expect(prisma.session.findMany).not.toHaveBeenCalled();
    expect(trialSlotsCache.set).not.toHaveBeenCalled();
  });

  it("loads SCHEDULED sessions from db on miss and caches them", async () => {
    trialSlotsCache.get.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-trial-w0",
        batchId: "batch-trial-1",
        startsAt: new Date("2026-07-25T11:00:00.000Z"),
        endsAt: new Date("2026-07-25T12:00:00.000Z"),
        type: SessionType.REGULAR,
        status: SessionStatus.SCHEDULED,
        batch: {
          id: "batch-trial-1",
          name: "Open Beginner Class",
          danceCategories: [{ name: "Hip-hop", description: "Open beginner" }],
        },
      },
    ]);

    const result = await service.listTrialSlots("studio-1");

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SessionStatus.SCHEDULED,
          batch: { studioId: "studio-1", active: true },
        }),
      }),
    );
    expect(
      prisma.session.findMany.mock.calls[0]?.[0]?.where?.type,
    ).toBeUndefined();
    expect(result).toEqual([
      {
        sessionId: "session-trial-w0",
        batchId: "batch-trial-1",
        batchName: "Open Beginner Class",
        styleBadge: "Hip-hop",
        startsAt: "2026-07-25T11:00:00.000Z",
        endsAt: "2026-07-25T12:00:00.000Z",
      },
    ]);
    expect(trialSlotsCache.set).toHaveBeenCalledWith(
      "studio-1",
      JSON.stringify(result),
    );
  });

  it("queries a specific day range without cache or horizon limit", async () => {
    trialSlotsCache.get.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-far-future",
        batchId: "batch-trial-1",
        startsAt: new Date("2026-12-25T11:00:00.000Z"),
        endsAt: new Date("2026-12-25T12:00:00.000Z"),
        type: SessionType.REGULAR,
        status: SessionStatus.SCHEDULED,
        batch: {
          id: "batch-trial-1",
          name: "Holiday Class",
          danceCategories: [{ name: "Hip-hop", description: "Open beginner" }],
        },
      },
    ]);

    const result = await service.listTrialSlots(
      "studio-1",
      "2026-12-25T00:00:00.000Z",
      "2026-12-26T00:00:00.000Z",
    );

    expect(trialSlotsCache.get).not.toHaveBeenCalled();
    expect(trialSlotsCache.set).not.toHaveBeenCalled();
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SessionStatus.SCHEDULED,
          startsAt: {
            gte: new Date("2026-12-25T00:00:00.000Z"),
            lt: new Date("2026-12-26T00:00:00.000Z"),
          },
          batch: { studioId: "studio-1", active: true },
        }),
      }),
    );
    expect(result).toEqual([
      {
        sessionId: "session-far-future",
        batchId: "batch-trial-1",
        batchName: "Holiday Class",
        styleBadge: "Hip-hop",
        startsAt: "2026-12-25T11:00:00.000Z",
        endsAt: "2026-12-25T12:00:00.000Z",
      },
    ]);
  });

  it("returns no sessions for a fully past day range", async () => {
    const result = await service.listTrialSlots(
      "studio-1",
      "2020-01-01T00:00:00.000Z",
      "2020-01-02T00:00:00.000Z",
    );

    expect(result).toEqual([]);
    expect(prisma.session.findMany).not.toHaveBeenCalled();
    expect(trialSlotsCache.get).not.toHaveBeenCalled();
  });
});

describe("SessionsService schedule mutations", () => {
  const prisma = {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    batchEnrollment: {
      findMany: vi.fn(),
    },
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
  };

  const trialSlotsCache = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  };

  const notifications = {
    create: vi.fn().mockResolvedValue({ id: "notif-1" }),
  };

  const chat = {
    postBatchSessionCard: vi.fn().mockResolvedValue({ id: "msg-1" }),
  };

  const crypto = {
    decryptUser: (user: unknown) => user,
  };

  const actor = {
    id: "owner-1",
    role: "OWNER",
    studioId: "studio-1",
  };

  let service: SessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionsService(
      prisma as never,
      scheduleConflicts as never,
      trialSlotsCache as never,
      notifications as never,
      chat as never,
      crypto as never,
    );
  });

  it("notifies enrolled students and posts a chat card when creating", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      name: "Kids Hip-hop",
      studioId: "studio-1",
      branchId: "branch-1",
      trainers: [{ trainerId: "trainer-1" }],
    });
    prisma.session.create.mockResolvedValue({
      id: "session-1",
      batchId: "batch-1",
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
      status: SessionStatus.SCHEDULED,
      type: SessionType.REGULAR,
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1" },
      { studentId: "student-2" },
    ]);

    await service.create(actor as never, {
      batchId: "batch-1",
      startsAt: "2026-08-10T10:00:00.000Z",
      endsAt: "2026-08-10T11:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(notifications.create).toHaveBeenCalledTimes(2);
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: "SESSION_ADDED",
        meta: expect.objectContaining({
          sessionId: "session-1",
          batchId: "batch-1",
        }),
      }),
    );
    await vi.waitFor(() => {
      expect(chat.postBatchSessionCard).toHaveBeenCalledWith(
        actor,
        "batch-1",
        expect.objectContaining({
          title: "New class session",
          startsAt: "2026-08-10T10:00:00.000Z",
        }),
      );
    });
  });

  it("still creates a session when notification fan-out fails", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      name: "Kids Hip-hop",
      studioId: "studio-1",
      branchId: "branch-1",
      trainers: [{ trainerId: "trainer-1" }],
    });
    prisma.session.create.mockResolvedValue({
      id: "session-1",
      batchId: "batch-1",
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
      status: SessionStatus.SCHEDULED,
      type: SessionType.REGULAR,
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1" },
    ]);
    notifications.create.mockRejectedValueOnce(
      new Error("transaction timeout"),
    );

    await expect(
      service.create(actor as never, {
        batchId: "batch-1",
        startsAt: "2026-08-10T10:00:00.000Z",
        endsAt: "2026-08-10T11:00:00.000Z",
      }),
    ).resolves.toMatchObject({ id: "session-1" });
    await vi.waitFor(() => {
      expect(chat.postBatchSessionCard).toHaveBeenCalled();
    });
  });

  it("rejects updating a completed session", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
      batch: {
        id: "batch-1",
        name: "Kids Hip-hop",
        studioId: "studio-1",
        branchId: "branch-1",
        trainers: [],
      },
    });

    await expect(
      service.updateSchedule(actor as never, "session-1", {
        startsAt: "2026-08-11T10:00:00.000Z",
        endsAt: "2026-08-11T11:00:00.000Z",
      }),
    ).rejects.toThrow(/Only scheduled sessions/);
    expect(prisma.session.update).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("cancels a scheduled session and notifies students", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.SCHEDULED,
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
      batch: {
        id: "batch-1",
        name: "Kids Hip-hop",
        studioId: "studio-1",
      },
    });
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.CANCELLED,
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1" },
    ]);

    await service.cancel(actor as never, "session-1");

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { status: SessionStatus.CANCELLED },
    });
    await vi.waitFor(() => {
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "student-1",
          type: "SESSION_CANCELLED",
        }),
      );
    });
    await vi.waitFor(() => {
      expect(chat.postBatchSessionCard).toHaveBeenCalledWith(
        actor,
        "batch-1",
        expect.objectContaining({ title: "Session cancelled" }),
      );
    });
  });

  it("rejects deleting a completed session", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      status: SessionStatus.COMPLETED,
      startsAt: new Date("2026-08-10T10:00:00.000Z"),
      endsAt: new Date("2026-08-10T11:00:00.000Z"),
      batch: { id: "batch-1", name: "Kids", studioId: "studio-1" },
    });

    await expect(service.cancel(actor as never, "session-1")).rejects.toThrow(
      /cannot be deleted/,
    );
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
