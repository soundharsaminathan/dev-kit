import {
  NotificationType,
  StudioInvoiceStatus,
  StudioPlan,
  UserRole,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioInvoicesService } from "./studio-invoices.service";

const adminActor = {
  id: "admin-1",
  role: UserRole.SYSTEM_ADMIN,
  studioId: null,
};

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

const decimal = (value: number) => ({
  toNumber: () => value,
  valueOf: () => value,
  toString: () => String(value),
});

const periodStart = new Date("2026-07-31T18:30:00.000Z");
const periodEnd = new Date("2026-08-31T18:29:59.999Z");

const baseInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: "inv-1",
  studioId: "studio-1",
  billedUserId: "owner-1",
  createdById: "admin-1",
  status: StudioInvoiceStatus.DRAFT,
  plan: StudioPlan.BASIC,
  listAmount: decimal(999),
  discount: decimal(0),
  periodStart,
  periodEnd,
  usageSnapshot: {
    month: "2026-08",
    activeStudents: 40,
    trainers: 2,
    staff: 1,
    batches: 4,
    sessionsThisMonth: 20,
  },
  notes: null,
  publishedAt: null,
  paidAt: null,
  paymentMethod: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  ...overrides,
});

function buildPrisma() {
  return {
    studio: {
      findUnique: vi.fn().mockResolvedValue({
        id: "studio-1",
        ownerId: "owner-1",
        name: "Rhythm House",
      }),
    },
    studioSettings: {
      findUnique: vi.fn().mockResolvedValue({ timezone: "Asia/Kolkata" }),
    },
    batchEnrollment: {
      findMany: vi.fn().mockResolvedValue([{ studentId: "s1" }, { studentId: "s2" }]),
    },
    user: {
      count: vi.fn().mockImplementation(({ where }: { where: { role: string } }) => {
        if (where.role === "TRAINER") return Promise.resolve(2);
        if (where.role === "STAFF") return Promise.resolve(1);
        return Promise.resolve(0);
      }),
    },
    batch: {
      count: vi.fn().mockResolvedValue(4),
    },
    session: {
      count: vi.fn().mockResolvedValue(20),
    },
    studioInvoice: {
      findMany: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

const notifications = {
  create: vi.fn().mockResolvedValue({ id: "notif-1" }),
};

describe("StudioInvoicesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets owners read usage for their studio", async () => {
    const prisma = buildPrisma();
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    const usage = await service.getUsage(ownerActor as never, "studio-1", "2026-08");

    expect(usage.activeStudents).toBe(2);
    expect(usage.trainers).toBe(2);
    expect(usage.suggestedPlan).toBe("BASIC");
    expect(usage.month).toBe("2026-08");
  });

  it("blocks staff from listing plan invoices", async () => {
    const prisma = buildPrisma();
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.list(staffActor as never, "studio-1"),
    ).rejects.toThrow(/Not allowed/);
  });

  it("creates a draft with suggested plan and snapshots usage", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.create.mockResolvedValue(baseInvoice());
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    const result = await service.create(adminActor as never, "studio-1", {
      month: "2026-08",
    });

    expect(prisma.studioInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StudioInvoiceStatus.DRAFT,
          plan: StudioPlan.BASIC,
          listAmount: 999,
          billedUserId: "owner-1",
          createdById: "admin-1",
        }),
      }),
    );
    expect(result.status).toBe("DRAFT");
    expect(result.amountDue).toBe(999);
  });

  it("rejects a second draft for the same month", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findFirst.mockResolvedValue(baseInvoice());
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.create(adminActor as never, "studio-1", { month: "2026-08" }),
    ).rejects.toThrow(/draft invoice already exists/i);
  });

  it("applies discount on draft update and floors amount due", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findUnique.mockResolvedValue(baseInvoice());
    prisma.studioInvoice.update.mockResolvedValue(
      baseInvoice({ discount: decimal(100), listAmount: decimal(999) }),
    );
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    const result = await service.update(adminActor as never, "inv-1", {
      discount: 100,
    });

    expect(result.discount).toBe(100);
    expect(result.amountDue).toBe(899);
  });

  it("rejects editing after publish", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findUnique.mockResolvedValue(
      baseInvoice({ status: StudioInvoiceStatus.PENDING }),
    );
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.update(adminActor as never, "inv-1", { discount: 50 }),
    ).rejects.toThrow(/Only draft invoices can be edited/);
  });

  it("publishes draft to pending and notifies the owner", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findUnique.mockResolvedValue(baseInvoice());
    prisma.studioInvoice.update.mockResolvedValue(
      baseInvoice({
        status: StudioInvoiceStatus.PENDING,
        publishedAt: new Date("2026-08-02T00:00:00.000Z"),
      }),
    );
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    const result = await service.publish(adminActor as never, "inv-1");

    expect(result.status).toBe("PENDING");
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-1",
        type: NotificationType.STUDIO_PLAN_INVOICE,
        deepLink: "/app/settings/plan",
      }),
    );
  });

  it("rejects mark paid while still draft", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findUnique.mockResolvedValue(baseInvoice());
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.markPaid(adminActor as never, "inv-1", "CASH"),
    ).rejects.toThrow(/Only pending invoices can be marked paid/);
  });

  it("lists only pending and paid for owners", async () => {
    const prisma = buildPrisma();
    prisma.studioInvoice.findMany.mockResolvedValue([
      baseInvoice({ status: StudioInvoiceStatus.PENDING }),
    ]);
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await service.list(ownerActor as never, "studio-1");

    expect(prisma.studioInvoice.findMany).toHaveBeenCalledWith({
      where: {
        studioId: "studio-1",
        status: {
          in: [StudioInvoiceStatus.PENDING, StudioInvoiceStatus.PAID],
        },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
  });

  it("blocks owners from creating invoices", async () => {
    const prisma = buildPrisma();
    const service = new StudioInvoicesService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.create(ownerActor as never, "studio-1", { month: "2026-08" }),
    ).rejects.toThrow(/Only system admins/);
  });
});
