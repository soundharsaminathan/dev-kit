import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateNotificationInput } from "./notification-commands.service";
import { NotificationCommandsService } from "./notification-commands.service";
import { NotificationsGateway } from "./notifications.gateway";
import { UnreadCacheService } from "./unread-cache.service";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UnreadCacheService)
    private readonly unreadCache: UnreadCacheService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
    @Inject(NotificationCommandsService)
    private readonly commands: NotificationCommandsService,
  ) {}

  create(data: CreateNotificationInput) {
    return this.commands.create(data);
  }

  async listForUser(
    userId: string,
    options: {
      cursor?: string;
      limit?: number;
      status?: "active" | "archived";
      unreadOnly?: boolean;
    } = {},
  ) {
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const status =
      options.status === "archived"
        ? NotificationStatus.ARCHIVED
        : NotificationStatus.ACTIVE;

    let cursorFilter: Prisma.NotificationWhereInput = {};
    if (options.cursor) {
      const cursorRow = await this.prisma.notification.findFirst({
        where: { id: options.cursor, userId },
      });
      if (cursorRow) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorRow.createdAt } },
            {
              createdAt: cursorRow.createdAt,
              id: { lt: cursorRow.id },
            },
          ],
        };
      }
    }

    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        status,
        deletedAt: null,
        ...(options.unreadOnly ? { readAt: null } : {}),
        ...cursorFilter,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async unreadCount(userId: string) {
    return { count: await this.unreadCache.get(userId) };
  }

  async markReadOne(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.readAt) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    await this.unreadCache.decrement(userId);
    const badge = await this.unreadCache.get(userId);
    this.gateway.emitToUser(userId, "notification.updated", updated);
    this.gateway.emitToUser(userId, "notifications.badge", {
      unreadCount: badge,
    });
    return updated;
  }

  async patchOne(
    userId: string,
    id: string,
    patch: { read?: boolean; archived?: boolean },
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const data: Prisma.NotificationUpdateInput = {};
    let unreadDelta = 0;

    if (patch.read === true && !notification.readAt) {
      data.readAt = new Date();
      unreadDelta -= 1;
    } else if (patch.read === false && notification.readAt) {
      data.readAt = null;
      if (notification.status === NotificationStatus.ACTIVE) {
        unreadDelta += 1;
      }
    }

    if (patch.archived === true) {
      data.status = NotificationStatus.ARCHIVED;
      data.archivedAt = new Date();
      if (!notification.readAt && patch.read !== true) {
        unreadDelta -= 1;
        data.readAt = new Date();
      }
    } else if (patch.archived === false) {
      data.status = NotificationStatus.ACTIVE;
      data.archivedAt = null;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data,
    });

    if (unreadDelta !== 0) {
      if (unreadDelta > 0) {
        await this.unreadCache.increment(userId);
      } else {
        await this.unreadCache.decrement(userId);
      }
    }

    const badge = await this.unreadCache.refresh(userId);
    this.gateway.emitToUser(userId, "notification.updated", updated);
    this.gateway.emitToUser(userId, "notifications.badge", {
      unreadCount: badge,
    });
    return updated;
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.ACTIVE,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    await this.unreadCache.invalidate(userId);
    const badge = await this.unreadCache.refresh(userId);
    this.gateway.emitToUser(userId, "notifications.bulk", {
      action: "mark_all_read",
      count: result.count,
    });
    this.gateway.emitToUser(userId, "notifications.badge", {
      unreadCount: badge,
    });
    return { count: result.count };
  }

  async softDelete(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.DELETED,
        deletedAt: new Date(),
        readAt: notification.readAt ?? new Date(),
      },
    });

    if (!notification.readAt) {
      await this.unreadCache.decrement(userId);
    }

    const badge = await this.unreadCache.refresh(userId);
    this.gateway.emitToUser(userId, "notification.updated", updated);
    this.gateway.emitToUser(userId, "notifications.badge", {
      unreadCount: badge,
    });
    return updated;
  }
}
