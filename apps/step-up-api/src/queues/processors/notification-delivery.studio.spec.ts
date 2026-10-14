import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDeliveryService } from "./notification-delivery.service";

describe("NotificationDeliveryService studio isolation", () => {
  const prisma = {
    notification: {
      findFirst: vi.fn(),
    },
    user: {
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
    emitToStudio: vi.fn(),
  };
  const preferences = {
    isChannelEnabled: vi.fn(),
    isInQuietHours: vi.fn(),
  };
  const unreadCache = {
    refresh: vi.fn(),
  };
  const push = {};
  const moduleRef = { get: vi.fn() };

  let service: NotificationDeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationDeliveryService(
      prisma as never,
      gateway as never,
      preferences as never,
      unreadCache as never,
      push as never,
      moduleRef as never,
    );
  });

  it("skips delivery when notification studio does not match recipient", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "n1",
      userId: "user-b",
      studioId: "studio-a",
      type: "BOOKING_CONFIRMED",
      status: "ACTIVE",
      deletedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({ studioId: "studio-b" });

    const result = await service.deliver("n1", "user-b");

    expect(result).toEqual({ skipped: true, reason: "studio_mismatch" });
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });
});
