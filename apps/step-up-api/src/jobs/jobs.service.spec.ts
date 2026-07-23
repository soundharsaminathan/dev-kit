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
});
