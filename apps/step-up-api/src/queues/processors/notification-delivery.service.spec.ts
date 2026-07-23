import {
  DeliveryStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDeliveryService } from "./notification-delivery.service";

describe("NotificationDeliveryService.deliver", () => {
  const prisma = {
    notification: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    notificationDelivery: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  const gateway = {
    emitToUser: vi.fn(),
  };

  const preferences = {
    isChannelEnabled: vi.fn(),
    isInQuietHours: vi.fn(),
  };

  const unreadCache = {
    refresh: vi.fn(),
  };

  const push = {
    sendToUser: vi.fn(),
  };

  const moduleRef = {
    get: vi.fn(() => {
      throw new Error("no push queue");
    }),
  };

  let service: NotificationDeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    unreadCache.refresh.mockResolvedValue(2);
    preferences.isChannelEnabled.mockResolvedValue(false);
    preferences.isInQuietHours.mockResolvedValue(false);
    service = new NotificationDeliveryService(
      prisma as never,
      gateway as never,
      preferences as never,
      unreadCache as never,
      push as never,
      moduleRef as never,
    );
  });

  it("skips when notification is missing", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.deliver("notif-missing", "user-1")).resolves.toEqual({
      skipped: true,
    });
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it("marks in-app delivery SENT and emits create + badge events", async () => {
    const notification = {
      id: "notif-1",
      userId: "user-1",
      type: NotificationType.MISSED_SESSION,
      title: "Missed session",
      body: "Absent",
      status: NotificationStatus.ACTIVE,
      deletedAt: null,
    };
    prisma.notification.findFirst.mockResolvedValue(notification);
    prisma.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: "del-inapp",
        channel: NotificationChannel.IN_APP,
      })
      .mockResolvedValueOnce(null);
    prisma.notificationDelivery.update.mockResolvedValue({
      id: "del-inapp",
      status: DeliveryStatus.SENT,
    });
    prisma.notificationDelivery.create.mockResolvedValue({
      id: "del-push",
      status: DeliveryStatus.SKIPPED,
    });

    const result = await service.deliver("notif-1", "user-1");

    expect(result).toEqual({ skippedPush: true });
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "del-inapp" },
        data: expect.objectContaining({
          status: DeliveryStatus.SENT,
        }),
      }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notification.created",
      notification,
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notifications.badge",
      { unreadCount: 2 },
    );
  });
});
