import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type Notification,
  type Prisma,
} from "@prisma/client";
import { OutboxService } from "../events/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { OUTBOX_EVENT_NOTIFICATION_CREATED } from "../queues/queue.constants";
import { resolveDeepLink } from "./deep-link";
import { buildNotificationCopy } from "./templates/notification-templates";
import { UnreadCacheService } from "./unread-cache.service";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title?: string;
  body?: string;
  meta?: Prisma.InputJsonValue;
  dedupeKey?: string | null;
  deepLink?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  planName?: string;
  periodEnd?: string;
  batchName?: string;
  sessionDate?: string;
  followerName?: string;
  conversationTitle?: string;
  messagePreview?: string;
  unreadCount?: number;
};

@Injectable()
export class NotificationCommandsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(UnreadCacheService)
    private readonly unreadCache: UnreadCacheService,
  ) {}

  private async refreshExisting(
    existing: Notification,
    input: CreateNotificationInput,
    copy: { title: string; body: string },
    deepLink: string | null,
  ): Promise<Notification> {
    const isActive =
      existing.status === NotificationStatus.ACTIVE &&
      existing.deletedAt == null;
    const shouldRefresh =
      !isActive ||
      existing.type === NotificationType.CHAT_MESSAGE ||
      existing.type === NotificationType.MISSED_SESSION;

    if (!shouldRefresh) {
      return existing;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.notification.update({
        where: { id: existing.id },
        data: {
          title: copy.title,
          body: copy.body,
          meta: input.meta,
          deepLink,
          status: NotificationStatus.ACTIVE,
          archivedAt: null,
          deletedAt: null,
          readAt: null,
          actorId: input.actorId ?? existing.actorId,
          entityType: input.entityType ?? existing.entityType,
          entityId: input.entityId ?? existing.entityId,
        },
      });
      await this.outbox.append(tx, OUTBOX_EVENT_NOTIFICATION_CREATED, {
        notificationId: row.id,
        userId: row.userId,
        type: row.type,
        refreshed: true,
        reactivated: !isActive,
      });
      return row;
    });

    const wasCountedUnread = isActive && existing.readAt == null;
    if (!wasCountedUnread) {
      await this.unreadCache.increment(input.userId);
    }
    return updated;
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const copy = buildNotificationCopy(input);
    const deepLink = resolveDeepLink({
      type: input.type,
      deepLink: input.deepLink,
      meta: input.meta,
    });

    if (input.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: {
          userId_dedupeKey: {
            userId: input.userId,
            dedupeKey: input.dedupeKey,
          },
        },
      });
      if (existing) {
        return this.refreshExisting(existing, input, copy, deepLink);
      }
    }

    try {
      const notification = await this.prisma.$transaction(async (tx) => {
        const created = await tx.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: copy.title,
            body: copy.body,
            meta: input.meta,
            dedupeKey: input.dedupeKey ?? null,
            deepLink,
            actorId: input.actorId ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
          },
        });

        await tx.notificationDelivery.create({
          data: {
            notificationId: created.id,
            channel: NotificationChannel.IN_APP,
            status: "PENDING",
          },
        });

        await this.outbox.append(tx, OUTBOX_EVENT_NOTIFICATION_CREATED, {
          notificationId: created.id,
          userId: created.userId,
          type: created.type,
        });

        return created;
      });

      await this.unreadCache.increment(input.userId);
      return notification;
    } catch (error) {
      if (
        input.dedupeKey &&
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        const existing = await this.prisma.notification.findUnique({
          where: {
            userId_dedupeKey: {
              userId: input.userId,
              dedupeKey: input.dedupeKey,
            },
          },
        });
        if (existing) {
          return this.refreshExisting(existing, input, copy, deepLink);
        }
      }
      throw error;
    }
  }
}
