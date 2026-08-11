import { MembershipStatus, NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsService } from "./jobs.service";

describe("JobsService.runDaily", () => {
  const prisma = {
    membership: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    invoice: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    studioSettings: {
      findMany: vi.fn(),
    },
  };

  const notifications = {
    create: vi.fn(),
  };

  const memberships = {
    ensureRenewalInvoice: vi.fn(),
    rollEndedActiveToNextDue: vi.fn(),
  };

  let service: JobsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.studioSettings.findMany.mockResolvedValue([]);
    memberships.ensureRenewalInvoice.mockResolvedValue({
      invoice: { id: "inv-1" },
      created: false,
    });
    memberships.rollEndedActiveToNextDue.mockResolvedValue({
      previousId: "mem-old",
      next: null,
      created: false,
    });
    service = new JobsService(
      prisma as never,
      notifications as never,
      memberships as never,
    );
  });

  it("creates NOT_RENEWED notifications when memberships expire", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const membership = {
      id: "mem-due",
      purchaserUserId: "student-1",
      subscriptionId: "sub-1",
      status: MembershipStatus.DUE,
      periodStart: new Date("2026-07-15T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      subscription: {
        id: "sub-1",
        name: "Adults Unlimited",
        studioId: "studio-1",
      },
    };

    prisma.membership.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "mem-due" }])
      .mockResolvedValueOnce([membership])
      .mockResolvedValueOnce([]);
    prisma.membership.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.findMany.mockResolvedValue([]);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.runDaily();

    expect(memberships.ensureRenewalInvoice).toHaveBeenCalledWith("mem-due");
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: NotificationType.NOT_RENEWED,
        planName: "Adults Unlimited",
        dedupeKey: "NOT_RENEWED:mem-due",
        meta: { membershipId: "mem-due", subscriptionId: "sub-1" },
      }),
    );
    expect(result.notRenewedNotifications).toBe(1);

    vi.useRealTimers();
  });

  it("skips NOT_RENEWED when an unpaid invoice will cover the lapse via PAYMENT_OVERDUE", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const membership = {
      id: "mem-due",
      purchaserUserId: "student-1",
      subscriptionId: "sub-1",
      status: MembershipStatus.DUE,
      periodStart: new Date("2026-07-15T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      subscription: {
        id: "sub-1",
        name: "Adults Unlimited",
        studioId: "studio-1",
      },
    };

    prisma.membership.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "mem-due" }])
      .mockResolvedValueOnce([membership])
      .mockResolvedValueOnce([]);
    prisma.membership.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findMany
      .mockResolvedValueOnce([{ membershipId: "mem-due" }])
      .mockResolvedValueOnce([
        { id: "inv-1", studentId: "student-1", student: { id: "student-1" } },
      ]);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.runDaily();

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.PAYMENT_OVERDUE,
        dedupeKey: "PAYMENT_OVERDUE:inv-1:2026-07-20",
      }),
    );
    expect(notifications.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.NOT_RENEWED }),
    );
    expect(result.notRenewedNotifications).toBe(0);
    expect(result.overdueNotifications).toBe(1);

    vi.useRealTimers();
  });

  it("uses each studio's due days from periodStart before expiring memberships", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const shortGrace = {
      id: "mem-short",
      purchaserUserId: "student-1",
      subscriptionId: "sub-1",
      status: MembershipStatus.DUE,
      periodStart: new Date("2026-07-17T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      subscription: {
        id: "sub-1",
        name: "Short Grace Plan",
        studioId: "studio-short",
      },
    };
    const longGrace = {
      id: "mem-long",
      purchaserUserId: "student-2",
      subscriptionId: "sub-2",
      status: MembershipStatus.DUE,
      periodStart: new Date("2026-07-17T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      subscription: {
        id: "sub-2",
        name: "Long Grace Plan",
        studioId: "studio-long",
      },
    };

    prisma.studioSettings.findMany.mockResolvedValue([
      { studioId: "studio-short", graceDays: 2, expireAlertDays: 7 },
      { studioId: "studio-long", graceDays: 5, expireAlertDays: 7 },
    ]);
    prisma.membership.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "mem-short" }, { id: "mem-long" }])
      .mockResolvedValueOnce([shortGrace, longGrace])
      .mockResolvedValueOnce([]);
    prisma.membership.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.findMany.mockResolvedValue([]);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.runDaily();

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: "NOT_RENEWED:mem-short",
      }),
    );
    expect(prisma.membership.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["mem-short"] } },
        data: { status: MembershipStatus.EXPIRED },
      }),
    );
    expect(result.expiredMemberships).toBe(1);

    vi.useRealTimers();
  });

  it("marks pending invoices overdue and emits PAYMENT_OVERDUE notifications", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma.membership.findMany.mockResolvedValue([]);
    prisma.membership.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.updateMany.mockResolvedValue({ count: 2 });
    prisma.invoice.findMany.mockResolvedValue([
      { id: "inv-1", studentId: "student-1", student: { id: "student-1" } },
      { id: "inv-2", studentId: "student-2", student: { id: "student-2" } },
    ]);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.runDaily();

    expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "OVERDUE" },
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: NotificationType.PAYMENT_OVERDUE,
        dedupeKey: "PAYMENT_OVERDUE:inv-1:2026-07-20",
        meta: { invoiceId: "inv-1" },
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-2",
        type: NotificationType.PAYMENT_OVERDUE,
        dedupeKey: "PAYMENT_OVERDUE:inv-2:2026-07-20",
      }),
    );
    expect(result.overdueInvoices).toBe(2);
    expect(result.overdueNotifications).toBe(2);

    vi.useRealTimers();
  });

  it("rolls ended ACTIVE memberships into next-period DUE and invoices them", async () => {
    prisma.membership.findMany
      .mockResolvedValueOnce([{ id: "mem-ended" }])
      .mockResolvedValueOnce([{ id: "mem-due" }, { id: "mem-expired" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.membership.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.findMany.mockResolvedValue([]);
    memberships.rollEndedActiveToNextDue.mockResolvedValue({
      previousId: "mem-ended",
      next: { id: "mem-sep-due" },
      created: true,
    });
    memberships.ensureRenewalInvoice
      .mockResolvedValueOnce({ invoice: { id: "inv-new" }, created: true })
      .mockResolvedValueOnce({
        invoice: { id: "inv-existing" },
        created: false,
      })
      .mockResolvedValueOnce({
        invoice: { id: "inv-sep" },
        created: true,
      });

    const result = await service.runDaily();

    expect(memberships.rollEndedActiveToNextDue).toHaveBeenCalledWith(
      "mem-ended",
    );
    expect(memberships.ensureRenewalInvoice).toHaveBeenCalledWith(
      "mem-sep-due",
    );
    expect(memberships.ensureRenewalInvoice).toHaveBeenCalledWith("mem-due");
    expect(memberships.ensureRenewalInvoice).toHaveBeenCalledWith(
      "mem-expired",
    );
    expect(result.dueMemberships).toBe(1);
    expect(result.renewalInvoicesCreated).toBe(2);
  });
});
