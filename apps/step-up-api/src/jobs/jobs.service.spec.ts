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
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: JobsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JobsService(prisma as never, notifications as never);
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
      periodEnd: new Date("2026-07-15T23:59:59.999Z"),
      subscription: {
        id: "sub-1",
        name: "Adults Unlimited",
      },
    };

    prisma.membership.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.membership.findMany
      .mockResolvedValueOnce([membership])
      .mockResolvedValueOnce([]);
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.findMany.mockResolvedValue([]);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.runDaily();

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

  it("marks pending invoices overdue and emits PAYMENT_OVERDUE notifications", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma.membership.updateMany.mockResolvedValue({ count: 0 });
    prisma.membership.findMany.mockResolvedValue([]);
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
});
