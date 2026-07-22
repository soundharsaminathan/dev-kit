import { NotificationType, PlanType, SubscriptionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionsService } from "./subscriptions.service";

describe("SubscriptionsService.renewManual", () => {
  const prisma = {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService(prisma as never, notifications as never);
  });

  it("creates a RENEWED notification when a subscription is renewed", async () => {
    const periodEnd = new Date("2026-02-28T23:59:59.999Z");
    const existing = {
      id: "sub-old",
      studentId: "student-1",
      planId: "plan-1",
      periodEnd,
      plan: {
        id: "plan-1",
        name: "Kids Unlimited",
        type: PlanType.UNLIMITED_KIDS,
        billingCadence: "MONTHLY",
        classCredits: null,
      },
    };

    const renewed = {
      id: "sub-new",
      studentId: "student-1",
      planId: "plan-1",
      status: SubscriptionStatus.ACTIVE,
      plan: existing.plan,
    };

    prisma.subscription.findUnique.mockResolvedValue(existing);
    prisma.subscription.update.mockResolvedValue({
      ...existing,
      status: SubscriptionStatus.EXPIRED,
    });
    prisma.subscription.create.mockResolvedValue(renewed);
    notifications.create.mockResolvedValue({ id: "notif-1" });

    const result = await service.renewManual("sub-old");

    expect(result).toEqual(renewed);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: NotificationType.RENEWED,
        planName: "Kids Unlimited",
        dedupeKey: "RENEWED:sub-new",
        meta: { subscriptionId: "sub-new", planId: "plan-1" },
      }),
    );
  });
});
