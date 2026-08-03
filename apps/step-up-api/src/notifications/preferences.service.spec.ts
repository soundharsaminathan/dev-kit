import { NotificationChannel } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesService } from "./preferences.service";
import { NOTIFICATION_TYPE_REGISTRY } from "./templates/notification-templates";

describe("PreferencesService", () => {
  const prisma = {
    notificationPreference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  let service: PreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (ops: unknown[]) =>
      Promise.all(ops),
    );
    service = new PreferencesService(prisma as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists registry defaults when user has no preference rows", async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([]);

    const prefs = await service.listForUser("user-1");

    const expectedCount = Object.values(NOTIFICATION_TYPE_REGISTRY).reduce(
      (sum, meta) => sum + meta.defaultChannels.length,
      0,
    );
    expect(prefs).toHaveLength(expectedCount);
    expect(
      prefs.find(
        (row) =>
          row.type === "MISSED_SESSION" &&
          row.channel === NotificationChannel.IN_APP,
      ),
    ).toEqual(
      expect.objectContaining({
        enabled: true,
        quietStartMinutes: null,
        quietEndMinutes: null,
      }),
    );
  });

  it("overlays stored preference rows onto registry defaults", async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        type: "MISSED_SESSION",
        channel: NotificationChannel.PUSH,
        enabled: false,
        quietStartMinutes: 1320,
        quietEndMinutes: 480,
      },
    ]);

    const prefs = await service.listForUser("user-1");
    const missedPush = prefs.find(
      (row) =>
        row.type === "MISSED_SESSION" &&
        row.channel === NotificationChannel.PUSH,
    );

    expect(missedPush).toEqual({
      type: "MISSED_SESSION",
      channel: NotificationChannel.PUSH,
      enabled: false,
      quietStartMinutes: 1320,
      quietEndMinutes: 480,
    });
  });

  it("upserts preferences in a transaction and returns the refreshed list", async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({});
    prisma.notificationPreference.findMany.mockResolvedValue([]);

    const result = await service.upsertMany("user-1", [
      {
        type: "CHAT_MESSAGE",
        channel: NotificationChannel.PUSH,
        enabled: false,
        quietStartMinutes: 0,
        quietEndMinutes: 360,
      },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_channel: {
            userId: "user-1",
            type: "CHAT_MESSAGE",
            channel: NotificationChannel.PUSH,
          },
        },
        create: expect.objectContaining({
          enabled: false,
          quietStartMinutes: 0,
          quietEndMinutes: 360,
        }),
        update: expect.objectContaining({
          enabled: false,
        }),
      }),
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("isChannelEnabled prefers a type-specific preference over wildcard and defaults", async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      enabled: false,
    });

    await expect(
      service.isChannelEnabled(
        "user-1",
        "MISSED_SESSION",
        NotificationChannel.PUSH,
      ),
    ).resolves.toBe(false);

    prisma.notificationPreference.findUnique.mockImplementation(
      async (args: { where: { userId_type_channel: { type: string } } }) => {
        if (args.where.userId_type_channel.type === "*") {
          return { enabled: false };
        }
        return null;
      },
    );

    await expect(
      service.isChannelEnabled(
        "user-1",
        "MISSED_SESSION",
        NotificationChannel.PUSH,
      ),
    ).resolves.toBe(false);
  });

  it("falls back to registry defaults when no preference row exists", async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);

    await expect(
      service.isChannelEnabled(
        "user-1",
        "MISSED_SESSION",
        NotificationChannel.PUSH,
      ),
    ).resolves.toBe(true);

    await expect(
      service.isChannelEnabled(
        "user-1",
        "MISSED_SESSION",
        NotificationChannel.EMAIL,
      ),
    ).resolves.toBe(false);

    await expect(
      service.isChannelEnabled(
        "user-1",
        "UNKNOWN_TYPE",
        NotificationChannel.EMAIL,
      ),
    ).resolves.toBe(false);

    await expect(
      service.isChannelEnabled(
        "user-1",
        "UNKNOWN_TYPE",
        NotificationChannel.IN_APP,
      ),
    ).resolves.toBe(true);
  });

  it("detects quiet hours for same-day and overnight windows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T10:00:00"));

    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        type: "MISSED_SESSION",
        quietStartMinutes: 9 * 60,
        quietEndMinutes: 12 * 60,
      },
    ]);

    await expect(
      service.isInQuietHours("user-1", "MISSED_SESSION"),
    ).resolves.toBe(true);

    vi.setSystemTime(new Date("2026-08-04T22:00:00"));
    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        type: "*",
        quietStartMinutes: 21 * 60,
        quietEndMinutes: 7 * 60,
      },
    ]);

    await expect(service.isInQuietHours("user-1", "RENEWED")).resolves.toBe(
      true,
    );
  });

  it("returns false for quiet hours when window is missing or start equals end", async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    await expect(
      service.isInQuietHours("user-1", "MISSED_SESSION"),
    ).resolves.toBe(false);

    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        type: "MISSED_SESSION",
        quietStartMinutes: 600,
        quietEndMinutes: 600,
      },
    ]);
    await expect(
      service.isInQuietHours("user-1", "MISSED_SESSION"),
    ).resolves.toBe(false);
  });
});
