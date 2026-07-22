import { NotificationType, PlanType, SubscriptionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsService } from "./jobs.service";

describe("JobsService.runDaily", () => {
  const prisma = {
    subscription: {
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

  it("creates NOT_RENEWED notifications when subscriptions expire", async () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const subscription = {
      id: "sub-due",
      studentId: "student-1",
      planId: "plan-1",
      status: SubscriptionStatus.DUE,
      periodEnd: new Date("2026-07-15T23:59:59.999Z"),
      plan: {
        id: "plan-1",
        name: "Adults Unlimited",
        type: PlanType.UNLIMITED_ADULTS,
      },
    };

    prisma.subscription.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.subscription.findMany
      .mockResolvedValueOnce([subscription])
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
        dedupeKey: "NOT_RENEWED:sub-due",
        meta: { subscriptionId: "sub-due", planId: "plan-1" },
      }),
    );
    expect(result.notRenewedNotifications).toBe(1);

    vi.useRealTimers();
  });
});
