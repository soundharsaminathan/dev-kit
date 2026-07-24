import { NotFoundException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const commands = {
    create: vi.fn(),
  };
  const unreadCache = {
    get: vi.fn(),
    increment: vi.fn(),
    decrement: vi.fn(),
    refresh: vi.fn(),
    invalidate: vi.fn(),
  };
  const gateway = {
    emitToUser: vi.fn(),
  };
  const prisma = {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  };

  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    unreadCache.get.mockResolvedValue(0);
    unreadCache.refresh.mockResolvedValue(0);
    service = new NotificationsService(
      prisma as never,
      unreadCache as never,
      gateway as never,
      commands as never,
    );
  });

  it("delegates create to commands service", async () => {
    commands.create.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      type: NotificationType.RENEWED,
    });

    await service.create({
      userId: "user-1",
      type: NotificationType.RENEWED,
      planName: "Monthly",
      periodEnd: "2026-08-01",
      meta: { subscriptionId: "sub-1" },
    });

    expect(commands.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: NotificationType.RENEWED,
      }),
    );
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it("marks one notification read and decrements unread cache", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      readAt: null,
      deletedAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      readAt: new Date("2026-07-20T12:00:00.000Z"),
    });
    unreadCache.decrement.mockResolvedValue(undefined);
    unreadCache.get.mockResolvedValue(3);

    const updated = await service.markReadOne("user-1", "notif-1");

    expect(updated.readAt).toBeTruthy();
    expect(unreadCache.decrement).toHaveBeenCalledWith("user-1");
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notification.updated",
      updated,
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notifications.badge",
      { unreadCount: 3 },
    );
  });

  it("is a no-op when marking an already-read notification", async () => {
    const existing = {
      id: "notif-1",
      userId: "user-1",
      readAt: new Date("2026-07-19T00:00:00.000Z"),
      deletedAt: null,
    };
    prisma.notification.findFirst.mockResolvedValue(existing);

    await expect(service.markReadOne("user-1", "notif-1")).resolves.toEqual(
      existing,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
    expect(unreadCache.decrement).not.toHaveBeenCalled();
  });

  it("throws when marking a missing notification", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(
      service.markReadOne("user-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("marks all unread notifications read and refreshes badge", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    unreadCache.invalidate.mockResolvedValue(undefined);
    unreadCache.refresh.mockResolvedValue(0);

    await expect(service.markAllRead("user-1")).resolves.toEqual({ count: 4 });
    expect(unreadCache.invalidate).toHaveBeenCalledWith("user-1");
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notifications.bulk",
      { action: "mark_all_read", count: 4 },
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notifications.badge",
      { unreadCount: 0 },
    );
  });

  it("returns unread count from cache", async () => {
    unreadCache.get.mockResolvedValue(7);
    await expect(service.unreadCount("user-1")).resolves.toEqual({ count: 7 });
  });

  it("lists notifications for a user with cursor pagination", async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: `notif-${index}`,
      userId: "user-1",
      title: `n${index}`,
    }));
    prisma.notification.findMany.mockResolvedValue(rows);

    const page = await service.listForUser("user-1", { limit: 20 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          deletedAt: null,
          status: "ACTIVE",
        }),
        take: 21,
      }),
    );
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe("notif-19");
  });

  it("marks unread via patchOne and increments badge", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      readAt: new Date("2026-07-19T00:00:00.000Z"),
      status: "ACTIVE",
      deletedAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: "notif-1",
      readAt: null,
      status: "ACTIVE",
    });
    unreadCache.increment.mockResolvedValue(undefined);
    unreadCache.refresh.mockResolvedValue(2);

    await service.patchOne("user-1", "notif-1", { read: false });

    expect(unreadCache.increment).toHaveBeenCalledWith("user-1");
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      "user-1",
      "notifications.badge",
      { unreadCount: 2 },
    );
  });

  it("archives via patchOne and marks read when unread", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      readAt: null,
      status: "ACTIVE",
      deletedAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: "notif-1",
      status: "ARCHIVED",
      readAt: new Date(),
    });
    unreadCache.decrement.mockResolvedValue(undefined);
    unreadCache.refresh.mockResolvedValue(0);

    await service.patchOne("user-1", "notif-1", { archived: true });

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ARCHIVED",
          readAt: expect.any(Date),
        }),
      }),
    );
    expect(unreadCache.decrement).toHaveBeenCalledWith("user-1");
  });

  it("soft-deletes a notification and decrements unread when unread", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      readAt: null,
      deletedAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: "notif-1",
      status: "DELETED",
      deletedAt: new Date(),
    });
    unreadCache.decrement.mockResolvedValue(undefined);
    unreadCache.refresh.mockResolvedValue(0);

    await service.softDelete("user-1", "notif-1");

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DELETED",
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(unreadCache.decrement).toHaveBeenCalledWith("user-1");
  });

  it("throws when soft-deleting a missing notification", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(
      service.softDelete("user-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
