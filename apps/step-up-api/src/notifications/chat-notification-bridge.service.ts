import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationCommandsService } from "./notification-commands.service";

@Injectable()
export class ChatNotificationBridgeService {
  private readonly logger = new Logger(ChatNotificationBridgeService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationCommandsService)
    private readonly commands: NotificationCommandsService,
  ) {}

  async notifyNewMessage(input: {
    conversationId: string;
    senderId: string;
    messageId: string;
    preview: string;
    conversationTitle?: string | null;
  }) {
    const members = await this.prisma.conversationMember.findMany({
      where: {
        conversationId: input.conversationId,
        userId: { not: input.senderId },
      },
      select: { userId: true, lastReadAt: true },
    });

    const day = new Date().toISOString().slice(0, 10);

    for (const member of members) {
      try {
        const unreadInConversation = await this.prisma.message.count({
          where: {
            conversationId: input.conversationId,
            senderId: { not: member.userId },
            deletedAt: null,
            createdAt: {
              gt: member.lastReadAt ?? new Date(0),
            },
          },
        });

        await this.commands.create({
          userId: member.userId,
          type: NotificationType.CHAT_MESSAGE,
          conversationTitle: input.conversationTitle ?? undefined,
          messagePreview: input.preview,
          unreadCount: Math.max(unreadInConversation, 1),
          actorId: input.senderId,
          entityType: "conversation",
          entityId: input.conversationId,
          dedupeKey: `CHAT_MESSAGE:${input.conversationId}:${member.userId}:${day}`,
          meta: {
            conversationId: input.conversationId,
            messageId: input.messageId,
            senderId: input.senderId,
          },
          deepLink: `/me/messages/${input.conversationId}`,
        });
      } catch (error) {
        this.logger.warn(
          `Chat bridge failed for ${member.userId}: ${String(error)}`,
        );
      }
    }
  }
}
