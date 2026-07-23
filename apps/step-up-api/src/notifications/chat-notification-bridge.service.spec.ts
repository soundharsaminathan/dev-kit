import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatNotificationBridgeService } from "./chat-notification-bridge.service";

describe("ChatNotificationBridgeService.notifyNewMessage", () => {
  const prisma = {
    conversationMember: {
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  };
  const commands = {
    create: vi.fn(),
  };

  let service: ChatNotificationBridgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatNotificationBridgeService(
      prisma as never,
      commands as never,
    );
  });

  it("creates CHAT_MESSAGE notifications for other members", async () => {
    prisma.conversationMember.findMany.mockResolvedValue([
      { userId: "user-2", lastReadAt: null },
      { userId: "user-3", lastReadAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    prisma.message.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    commands.create.mockResolvedValue({ id: "n1" });

    await service.notifyNewMessage({
      conversationId: "conv-1",
      senderId: "user-1",
      messageId: "msg-1",
      preview: "hello there",
      conversationTitle: "Batch chat",
    });

    expect(commands.create).toHaveBeenCalledTimes(2);
    expect(commands.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: NotificationType.CHAT_MESSAGE,
        messagePreview: "hello there",
        conversationTitle: "Batch chat",
        unreadCount: 2,
        actorId: "user-1",
        entityType: "conversation",
        entityId: "conv-1",
        deepLink: "/me/messages/conv-1",
        dedupeKey: expect.stringMatching(/^CHAT_MESSAGE:conv-1:user-2:/),
      }),
    );
  });

  it("continues when one member notification fails", async () => {
    prisma.conversationMember.findMany.mockResolvedValue([
      { userId: "user-2", lastReadAt: null },
      { userId: "user-3", lastReadAt: null },
    ]);
    prisma.message.count.mockResolvedValue(1);
    commands.create
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ id: "n2" });

    await expect(
      service.notifyNewMessage({
        conversationId: "conv-1",
        senderId: "user-1",
        messageId: "msg-1",
        preview: "hi",
      }),
    ).resolves.toBeUndefined();

    expect(commands.create).toHaveBeenCalledTimes(2);
  });
});
