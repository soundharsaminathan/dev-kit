import { NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnreadCacheService } from "./unread-cache.service";

describe("UnreadCacheService", () => {
  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn(),
  };

  const prisma = {
    notification: {
      count: vi.fn(),
    },
  };

  let service: UnreadCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UnreadCacheService(redis as never, prisma as never);
  });

  it("returns a valid cached unread count", async () => {
    redis.get.mockResolvedValue("3");

    await expect(service.get("user-1")).resolves.toBe(3);
    expect(prisma.notification.count).not.toHaveBeenCalled();
  });

  it("refreshes from prisma when cache is missing or invalid", async () => {
    redis.get.mockResolvedValue(null);
    prisma.notification.count.mockResolvedValue(5);

    await expect(service.get("user-1")).resolves.toBe(5);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: NotificationStatus.ACTIVE,
        readAt: null,
        deletedAt: null,
      },
    });
    expect(redis.set).toHaveBeenCalledWith("notif:unread:user-1", "5", 3600);

    redis.get.mockResolvedValue("-2");
    prisma.notification.count.mockResolvedValue(1);
    await expect(service.get("user-1")).resolves.toBe(1);
  });

  it("increments and refreshes when the counter goes negative", async () => {
    redis.incr.mockResolvedValue(4);
    await service.increment("user-1");
    expect(redis.incr).toHaveBeenCalledWith("notif:unread:user-1");

    redis.incr.mockResolvedValue(-1);
    prisma.notification.count.mockResolvedValue(0);
    await service.increment("user-1");
    expect(prisma.notification.count).toHaveBeenCalled();
  });

  it("no-ops increment when redis is unavailable", async () => {
    redis.incr.mockResolvedValue(null);
    await service.increment("user-1");
    expect(prisma.notification.count).not.toHaveBeenCalled();
  });

  it("decrements and clamps negative values to zero", async () => {
    redis.decr.mockResolvedValue(2);
    await service.decrement("user-1");
    expect(redis.decr).toHaveBeenCalledWith("notif:unread:user-1");

    redis.decr.mockResolvedValue(-1);
    await service.decrement("user-1");
    expect(redis.set).toHaveBeenCalledWith("notif:unread:user-1", "0", 3600);
  });

  it("no-ops decrement when redis is unavailable", async () => {
    redis.decr.mockResolvedValue(null);
    await service.decrement("user-1");
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("invalidates the unread key", async () => {
    await service.invalidate("user-1");
    expect(redis.del).toHaveBeenCalledWith("notif:unread:user-1");
  });
});
