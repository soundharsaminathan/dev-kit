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
    moduleRef.get.mockImplementation(() => {
      throw new Error("no push queue");
    });
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
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: NotificationChannel.PUSH,
          status: DeliveryStatus.SKIPPED,
          errorCode: "preference_disabled",
        }),
      }),
    );
  });

  it("skips push during quiet hours", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-2",
      userId: "user-1",
      type: NotificationType.RENEWED,
      status: NotificationStatus.ACTIVE,
      deletedAt: null,
    });
    prisma.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: "del-inapp",
        channel: NotificationChannel.IN_APP,
      })
      .mockResolvedValueOnce(null);
    prisma.notificationDelivery.update.mockResolvedValue({});
    prisma.notificationDelivery.create.mockResolvedValue({});
    preferences.isChannelEnabled.mockResolvedValue(true);
    preferences.isInQuietHours.mockResolvedValue(true);

    await expect(service.deliver("notif-2", "user-1")).resolves.toEqual({
      skippedPush: true,
    });
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: NotificationChannel.PUSH,
          status: DeliveryStatus.SKIPPED,
          errorCode: "quiet_hours",
        }),
      }),
    );
  });

  it("enqueues push when enabled and outside quiet hours", async () => {
    const pushQueue = { add: vi.fn() };
    moduleRef.get.mockReturnValue(pushQueue);

    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-3",
      userId: "user-1",
      type: NotificationType.MISSED_SESSION,
      status: NotificationStatus.ACTIVE,
      deletedAt: null,
    });
    prisma.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: "del-inapp",
        channel: NotificationChannel.IN_APP,
      })
      .mockResolvedValueOnce(null);
    prisma.notificationDelivery.update.mockResolvedValue({});
    prisma.notificationDelivery.create.mockResolvedValue({
      id: "del-push",
      status: DeliveryStatus.PENDING,
    });
    preferences.isChannelEnabled.mockResolvedValue(true);
    preferences.isInQuietHours.mockResolvedValue(false);

    await expect(service.deliver("notif-3", "user-1")).resolves.toEqual({
      ok: true,
    });

    expect(pushQueue.add).toHaveBeenCalledWith(
      "push",
      expect.objectContaining({
        notificationId: "notif-3",
        userId: "user-1",
        deliveryId: "del-push",
      }),
      expect.objectContaining({ attempts: 5 }),
    );
  });

  it("sends push inline when the queue is unavailable", async () => {
    moduleRef.get.mockImplementation(() => {
      throw new Error("no push queue");
    });

    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-4",
      userId: "user-1",
      type: NotificationType.MISSED_SESSION,
      status: NotificationStatus.ACTIVE,
      deletedAt: null,
    });
    prisma.notification.findUnique.mockResolvedValue({
      id: "notif-4",
      title: "Missed session",
      body: "Absent",
      deepLink: "/me/attendance",
      type: NotificationType.MISSED_SESSION,
      meta: { sessionId: "session-1" },
    });
    prisma.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: "del-inapp",
        channel: NotificationChannel.IN_APP,
      })
      .mockResolvedValueOnce(null);
    prisma.notificationDelivery.update.mockResolvedValue({});
    prisma.notificationDelivery.create.mockResolvedValue({
      id: "del-push",
      status: DeliveryStatus.PENDING,
    });
    preferences.isChannelEnabled.mockResolvedValue(true);
    preferences.isInQuietHours.mockResolvedValue(false);
    push.sendToUser.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      skipped: false,
      messageIds: ["msg-1"],
    });

    await expect(service.deliver("notif-4", "user-1")).resolves.toEqual({
      ok: true,
    });

    expect(push.sendToUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        title: "Missed session",
        deepLink: "/me/attendance",
      }),
    );
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "del-push" },
        data: expect.objectContaining({
          status: DeliveryStatus.SENT,
          providerId: "msg-1",
        }),
      }),
    );
  });
});
