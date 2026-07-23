import { NotificationChannel, NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OUTBOX_EVENT_NOTIFICATION_CREATED } from "../queues/queue.constants";
import { NotificationCommandsService } from "./notification-commands.service";

describe("NotificationCommandsService.create", () => {
  const prisma = {
    notification: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const outbox = {
    append: vi.fn(),
  };

  const unreadCache = {
    increment: vi.fn(),
  };

  let service: NotificationCommandsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    service = new NotificationCommandsService(
      prisma as never,
      outbox as never,
      unreadCache as never,
    );
  });

  it("creates notification, pending delivery, outbox event, and bumps unread", async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({
      id: "notif-1",
      userId: "student-1",
      type: NotificationType.MISSED_SESSION,
      title: "Missed session",
      body: "Absent",
    });
    prisma.notificationDelivery.create.mockResolvedValue({ id: "del-1" });
    outbox.append.mockResolvedValue(undefined);
    unreadCache.increment.mockResolvedValue(1);

    const result = await service.create({
      userId: "student-1",
      type: NotificationType.MISSED_SESSION,
      batchName: "Kids Hip-Hop",
      sessionDate: "2026-07-20",
      dedupeKey: "MISSED_SESSION:session-1:student-1",
    });

    expect(result.id).toBe("notif-1");
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: NotificationType.MISSED_SESSION,
          dedupeKey: "MISSED_SESSION:session-1:student-1",
        }),
      }),
    );
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith({
      data: {
        notificationId: "notif-1",
        channel: NotificationChannel.IN_APP,
        status: "PENDING",
      },
    });
    expect(outbox.append).toHaveBeenCalledWith(
      prisma,
      OUTBOX_EVENT_NOTIFICATION_CREATED,
      expect.objectContaining({
        notificationId: "notif-1",
        userId: "student-1",
      }),
    );
    expect(unreadCache.increment).toHaveBeenCalledWith("student-1");
  });

  it("returns existing notification for the same dedupeKey (no duplicate)", async () => {
    const existing = {
      id: "notif-existing",
      userId: "student-1",
      type: NotificationType.MISSED_SESSION,
      status: "ACTIVE",
      deletedAt: null,
      readAt: null,
    };
    prisma.notification.findUnique.mockResolvedValue(existing);

    const result = await service.create({
      userId: "student-1",
      type: NotificationType.MISSED_SESSION,
      dedupeKey: "MISSED_SESSION:session-1:student-1",
    });

    expect(result).toEqual(existing);
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(unreadCache.increment).not.toHaveBeenCalled();
  });

  it("refreshes CHAT_MESSAGE rows on dedupe hit and re-opens unread", async () => {
    const existing = {
      id: "notif-chat",
      userId: "student-1",
      type: NotificationType.CHAT_MESSAGE,
      status: "ACTIVE",
      deletedAt: null,
      readAt: new Date("2026-07-19T00:00:00.000Z"),
    };
    prisma.notification.findUnique.mockResolvedValue(existing);
    prisma.notification.update.mockResolvedValue({
      ...existing,
      readAt: null,
      title: "New message",
      body: "hey",
    });
    outbox.append.mockResolvedValue(undefined);
    unreadCache.increment.mockResolvedValue(1);

    const result = await service.create({
      userId: "student-1",
      type: NotificationType.CHAT_MESSAGE,
      dedupeKey: "CHAT:conv-1",
      conversationTitle: "Studio desk",
      messagePreview: "hey",
    });

    expect(result.readAt).toBeNull();
    expect(prisma.notification.update).toHaveBeenCalled();
    expect(outbox.append).toHaveBeenCalledWith(
      prisma,
      OUTBOX_EVENT_NOTIFICATION_CREATED,
      expect.objectContaining({
        notificationId: "notif-chat",
        refreshed: true,
      }),
    );
    expect(unreadCache.increment).toHaveBeenCalledWith("student-1");
  });

  it("returns existing row when create races with P2002 unique violation", async () => {
    prisma.notification.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "notif-race",
        userId: "student-1",
        type: NotificationType.PAYMENT_OVERDUE,
      });
    prisma.$transaction.mockRejectedValue({ code: "P2002" });

    const result = await service.create({
      userId: "student-1",
      type: NotificationType.PAYMENT_OVERDUE,
      dedupeKey: "PAYMENT_OVERDUE:inv-1:2026-07-20",
    });

    expect(result.id).toBe("notif-race");
    expect(prisma.notification.findUnique).toHaveBeenCalledTimes(2);
  });
});
