import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService.create", () => {
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
});
