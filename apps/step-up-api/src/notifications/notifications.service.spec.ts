import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService.create", () => {
  const prisma = {
    notification: {
      create: vi.fn(),
    },
  };

  const push = {
    sendToUser: vi.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(prisma as never, push as never);
  });

  it("persists the notification and sends a push message", async () => {
    prisma.notification.create.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      type: NotificationType.RENEWED,
      title: "Plan renewed",
      body: "Your plan is active.",
    });
    push.sendToUser.mockResolvedValue(undefined);

    await service.create({
      userId: "user-1",
      type: NotificationType.RENEWED,
      title: "Plan renewed",
      body: "Your plan is active.",
      meta: { subscriptionId: "sub-1" },
    });

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(push.sendToUser).toHaveBeenCalledWith("user-1", {
      title: "Plan renewed",
      body: "Your plan is active.",
      data: {
        notificationId: "notif-1",
        type: NotificationType.RENEWED,
        subscriptionId: "sub-1",
      },
    });
  });
});
