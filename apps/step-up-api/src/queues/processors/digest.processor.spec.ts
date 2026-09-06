import {
  DeliveryStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigestProcessor } from "./digest.processor";

describe("DigestProcessor", () => {
  const prisma = {
    user: {
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
    notificationDelivery: {
      createMany: vi.fn(),
    },
  };

  const preferences = {
    isChannelEnabled: vi.fn(),
  };

  const email = {
    isConfigured: vi.fn(() => false),
    sendNotificationDigest: vi.fn(),
  };

  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      ...user,
      email: "member@example.com",
    })),
  };

  let processor: DigestProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    email.isConfigured.mockReturnValue(false);
    processor = new DigestProcessor(
      prisma as never,
      preferences as never,
      email as never,
      crypto as never,
    );
  });

  it("skips users with email digests disabled", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
    preferences.isChannelEnabled.mockResolvedValue(false);

    await expect(
      processor.process({ data: { userId: "user-1" } } as never),
    ).resolves.toEqual({ digests: 0 });
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it("records SKIPPED email deliveries when provider is not configured", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
    preferences.isChannelEnabled.mockResolvedValue(true);
    prisma.notification.findMany.mockResolvedValue([
      { id: "n1", type: "PAYMENT_OVERDUE" },
      { id: "n2", type: "SUBSCRIPTION_EXPIRING" },
    ]);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 2 });

    await expect(
      processor.process({ data: { userId: "user-1" } } as never),
    ).resolves.toEqual({ digests: 1 });

    expect(prisma.notificationDelivery.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          notificationId: "n1",
          channel: NotificationChannel.EMAIL,
          status: DeliveryStatus.SKIPPED,
          errorCode: "email_provider_not_configured",
        }),
        expect.objectContaining({
          notificationId: "n2",
          channel: NotificationChannel.EMAIL,
          status: DeliveryStatus.SKIPPED,
        }),
      ],
    });
  });

  it("sends a Titan digest and records SENT deliveries", async () => {
    email.isConfigured.mockReturnValue(true);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        encryptedKey: "key",
        piiCiphertext: "cipher",
        piiIv: "iv",
      },
    ]);
    preferences.isChannelEnabled.mockResolvedValue(true);
    prisma.notification.findMany.mockResolvedValue([
      { id: "n1", type: "PAYMENT_OVERDUE", title: "Overdue", body: "Pay now" },
    ]);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 1 });
    email.sendNotificationDigest.mockResolvedValue(undefined);

    await expect(
      processor.process({ data: { userId: "user-1" } } as never),
    ).resolves.toEqual({ digests: 1 });

    expect(email.sendNotificationDigest).toHaveBeenCalledWith({
      to: "member@example.com",
      items: [{ title: "Overdue", body: "Pay now" }],
    });
    expect(prisma.notificationDelivery.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          notificationId: "n1",
          channel: NotificationChannel.EMAIL,
          status: DeliveryStatus.SENT,
        }),
      ],
    });
  });

  it("skips users with no unread high-priority notifications", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
    preferences.isChannelEnabled.mockResolvedValue(true);
    prisma.notification.findMany.mockResolvedValue([]);

    await expect(processor.process({ data: {} } as never)).resolves.toEqual({
      digests: 0,
    });
    expect(prisma.notificationDelivery.createMany).not.toHaveBeenCalled();
  });

  it("queries active unread high-priority types only", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
    preferences.isChannelEnabled.mockResolvedValue(true);
    prisma.notification.findMany.mockResolvedValue([]);

    await processor.process({ data: { userId: "user-1" } } as never);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: NotificationStatus.ACTIVE,
          readAt: null,
          deletedAt: null,
          type: {
            in: ["SUBSCRIPTION_EXPIRING", "PAYMENT_OVERDUE", "NOT_RENEWED"],
          },
        }),
      }),
    );
  });
});
