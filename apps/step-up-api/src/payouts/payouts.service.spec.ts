import { TrainerPayoutStatus, UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PayoutsService } from "./payouts.service";

const ownerActor = {
  id: "owner-1",
  role: UserRole.OWNER,
  studioId: "studio-1",
};

const staffActor = {
  id: "staff-1",
  role: UserRole.STAFF,
  studioId: "studio-1",
};

const trainerActor = {
  id: "trainer-1",
  role: UserRole.TRAINER,
  studioId: "studio-1",
};

const decimal = (value: number) => ({
  toNumber: () => value,
  valueOf: () => value,
});

const basePayout = (overrides: Record<string, unknown> = {}) => ({
  id: "payout-1",
  studioId: "studio-1",
  trainerId: "trainer-1",
  periodStart: new Date("2026-07-01T00:00:00.000Z"),
  periodEnd: new Date("2026-07-31T23:59:59.999Z"),
  sessionCount: 2,
  amount: decimal(2500),
  notes: null,
  status: TrainerPayoutStatus.DRAFT,
  sentAt: null,
  paidAt: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  trainer: { id: "trainer-1", name: "Alex Trainer" },
  ...overrides,
});

const trainerPayoutPrisma = () => ({
  trainerPayout: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const notifications = {
  create: vi.fn().mockResolvedValue({ id: "notif-1" }),
};

const crypto = {
  decryptUser: (user: unknown) => user,
};

function buildService(
  prisma: ReturnType<typeof trainerPayoutPrisma>,
): PayoutsService {
  return new PayoutsService(
    prisma as never,
    notifications as never,
    crypto as never,
  );
}

describe("PayoutsService.list", () => {
  it("scopes trainers to their own payouts and presents trainer names", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findMany.mockResolvedValue([
      basePayout(),
      basePayout({ id: "payout-2", amount: null }),
    ]);
    const service = buildService(prisma);

    const result = await service.list(trainerActor as never, "studio-1");

    expect(prisma.trainerPayout.findMany).toHaveBeenCalledWith({
      where: { studioId: "studio-1", trainerId: "trainer-1" },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: { trainer: true },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "payout-1",
      trainerName: "Alex Trainer",
      amount: 2500,
      status: TrainerPayoutStatus.DRAFT,
    });
    expect(result[1]).toMatchObject({ id: "payout-2", amount: null });
  });

  it("lists all payouts for owner/staff", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findMany.mockResolvedValue([basePayout()]);
    const service = buildService(prisma);

    await service.list(ownerActor as never, "studio-1");

    expect(prisma.trainerPayout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studioId: "studio-1" } }),
    );
  });

  it("rejects cross-studio access", async () => {
    const service = buildService(trainerPayoutPrisma());

    await expect(service.list(ownerActor as never, "studio-2")).rejects.toThrow(
      /own studio/,
    );
  });
});

describe("PayoutsService.getById", () => {
  it("includes linked sessions ordered by startsAt", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(
      basePayout({
        sessions: [
          {
            session: {
              id: "session-2",
              startsAt: new Date("2026-07-20T10:00:00.000Z"),
              endsAt: new Date("2026-07-20T11:00:00.000Z"),
              batch: { id: "batch-1", name: "Kids Hip-hop" },
            },
          },
        ],
      }),
    );
    const service = buildService(prisma);

    const result = await service.getById(trainerActor as never, "payout-1");

    expect(result.sessions).toEqual([
      {
        id: "session-2",
        batchId: "batch-1",
        batchName: "Kids Hip-hop",
        startsAt: "2026-07-20T10:00:00.000Z",
        endsAt: "2026-07-20T11:00:00.000Z",
      },
    ]);
  });

  it("forbids a trainer viewing another trainer's payout", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(
      basePayout({ trainerId: "trainer-2" }),
    );
    const service = buildService(prisma);

    await expect(
      service.getById(trainerActor as never, "payout-1"),
    ).rejects.toThrow(/own payouts/);
  });

  it("throws not found for missing payout", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(null);
    const service = buildService(prisma);

    await expect(
      service.getById(ownerActor as never, "missing"),
    ).rejects.toThrow(/Payout not found/);
  });
});

describe("PayoutsService.updateDraft", () => {
  it("updates amount and notes while draft", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(basePayout());
    prisma.trainerPayout.update.mockResolvedValue(
      basePayout({ amount: decimal(3000), notes: "Reviewed" }),
    );
    const service = buildService(prisma);

    const result = await service.updateDraft(ownerActor as never, "payout-1", {
      amount: 3000,
      notes: "Reviewed",
    });

    expect(prisma.trainerPayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: { amount: 3000, notes: "Reviewed" },
    });
    expect(result).toMatchObject({ amount: 3000, notes: "Reviewed" });
  });

  it("rejects editing a sent payout", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(
      basePayout({ status: TrainerPayoutStatus.SENT }),
    );
    const service = buildService(prisma);

    await expect(
      service.updateDraft(ownerActor as never, "payout-1", {
        amount: 3000,
      }),
    ).rejects.toThrow(/Only draft payouts/);
  });

  it("rejects trainer managing a payout", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(basePayout());
    const service = buildService(prisma);

    await expect(
      service.updateDraft(trainerActor as never, "payout-1", {
        amount: 3000,
      }),
    ).rejects.toThrow(/owner or staff/);
  });
});

describe("PayoutsService.send", () => {
  it("moves DRAFT to SENT and notifies the trainer", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(basePayout());
    prisma.trainerPayout.update.mockResolvedValue(
      basePayout({
        status: TrainerPayoutStatus.SENT,
        sentAt: new Date("2026-08-02T00:00:00.000Z"),
      }),
    );
    const service = buildService(prisma);

    const result = await service.send(ownerActor as never, "payout-1");

    expect(prisma.trainerPayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: { status: TrainerPayoutStatus.SENT, sentAt: expect.any(Date) },
    });
    expect(result.status).toBe(TrainerPayoutStatus.SENT);
    expect(notifications.create).toHaveBeenCalledWith({
      userId: "trainer-1",
      type: "TRAINER_PAYOUT",
      dedupeKey: "TRAINER_PAYOUT:payout-1",
      meta: { payoutId: "payout-1" },
      entityType: "trainerPayout",
      entityId: "payout-1",
    });
  });

  it("rejects sending a payout that is not DRAFT", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(
      basePayout({ status: TrainerPayoutStatus.PAID }),
    );
    const service = buildService(prisma);

    await expect(service.send(ownerActor as never, "payout-1")).rejects.toThrow(
      /Only draft payouts/,
    );
  });
});

describe("PayoutsService.markPaid", () => {
  it("moves SENT to PAID", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(
      basePayout({ status: TrainerPayoutStatus.SENT }),
    );
    prisma.trainerPayout.update.mockResolvedValue(
      basePayout({
        status: TrainerPayoutStatus.PAID,
        paidAt: new Date("2026-08-05T00:00:00.000Z"),
      }),
    );
    const service = buildService(prisma);

    const result = await service.markPaid(staffActor as never, "payout-1");

    expect(prisma.trainerPayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: { status: TrainerPayoutStatus.PAID, paidAt: expect.any(Date) },
    });
    expect(result.status).toBe(TrainerPayoutStatus.PAID);
  });

  it("rejects marking a DRAFT payout paid", async () => {
    const prisma = trainerPayoutPrisma();
    prisma.trainerPayout.findUnique.mockResolvedValue(basePayout());
    const service = buildService(prisma);

    await expect(
      service.markPaid(ownerActor as never, "payout-1"),
    ).rejects.toThrow(/Only sent payouts/);
  });
});
