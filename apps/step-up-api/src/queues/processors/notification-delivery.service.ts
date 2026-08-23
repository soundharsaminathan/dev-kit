import { getQueueToken } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  DeliveryStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";
import type { Queue } from "bullmq";
import { NotificationsGateway } from "../../notifications/notifications.gateway";
import { PreferencesService } from "../../notifications/preferences.service";
import { PushService } from "../../notifications/push.service";
import { UnreadCacheService } from "../../notifications/unread-cache.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NOTIFICATION_PUSH_QUEUE } from "../queue.constants";

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private pushQueue: Queue | null = null;
  private resolvedQueue = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsGateway)
    private readonly gateway: NotificationsGateway,
    @Inject(PreferencesService)
    private readonly preferences: PreferencesService,
    @Inject(UnreadCacheService)
    private readonly unreadCache: UnreadCacheService,
    @Inject(PushService) private readonly push: PushService,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  private resolvePushQueue() {
    if (this.resolvedQueue) {
      return this.pushQueue;
    }
    this.resolvedQueue = true;
    try {
      this.pushQueue = this.moduleRef.get<Queue>(
        getQueueToken(NOTIFICATION_PUSH_QUEUE),
        { strict: false },
      );
    } catch {
      this.pushQueue = null;
    }
    return this.pushQueue;
  }

  async deliver(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        status: NotificationStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!notification) {
      return { skipped: true };
    }

    if (notification.studioId) {
      const recipient = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { studioId: true },
      });
      if (!recipient?.studioId || recipient.studioId !== notification.studioId) {
        this.logger.warn(
          `Skipped cross-studio notification ${notificationId} for user ${userId}`,
        );
        return { skipped: true, reason: "studio_mismatch" };
      }
    }

    const existingInApp = await this.prisma.notificationDelivery.findFirst({
      where: {
        notificationId,
        channel: NotificationChannel.IN_APP,
      },
    });

    if (existingInApp) {
      await this.prisma.notificationDelivery.update({
        where: { id: existingInApp.id },
        data: {
          status: DeliveryStatus.SENT,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    } else {
      await this.prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel: NotificationChannel.IN_APP,
          status: DeliveryStatus.SENT,
          sentAt: new Date(),
          attemptCount: 1,
        },
      });
    }

    const badge = await this.unreadCache.refresh(userId);
    this.gateway.emitToUser(userId, "notification.created", notification);
    this.gateway.emitToUser(userId, "notifications.badge", {
      unreadCount: badge,
    });

    const pushEnabled = await this.preferences.isChannelEnabled(
      userId,
      notification.type,
      NotificationChannel.PUSH,
    );
    const quiet = await this.preferences.isInQuietHours(
      userId,
      notification.type,
    );

    if (!pushEnabled || quiet) {
      await this.recordPushSkipped(
        notificationId,
        quiet ? "quiet_hours" : "preference_disabled",
      );
      return { skippedPush: true };
    }

    let pushDelivery = await this.prisma.notificationDelivery.findFirst({
      where: {
        notificationId,
        channel: NotificationChannel.PUSH,
      },
    });

    if (!pushDelivery) {
      pushDelivery = await this.prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel: NotificationChannel.PUSH,
          status: DeliveryStatus.PENDING,
          attemptCount: 0,
        },
      });
    } else if (pushDelivery.status === DeliveryStatus.SENT) {
      pushDelivery = await this.prisma.notificationDelivery.update({
        where: { id: pushDelivery.id },
        data: { status: DeliveryStatus.PENDING },
      });
    }

    const pushQueue = this.resolvePushQueue();
    if (pushQueue) {
      await pushQueue.add(
        "push",
        {
          notificationId,
          userId,
          deliveryId: pushDelivery.id,
        },
        {
          jobId: `push:${notificationId}:${Date.now()}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
    } else {
      await this.sendPushInline(notificationId, userId, pushDelivery.id);
    }

    return { ok: true };
  }

  async sendPushInline(
    notificationId: string,
    userId: string,
    deliveryId: string,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      return;
    }

    try {
      const result = await this.push.sendToUser(userId, {
        title: notification.title,
        body: notification.body,
        deepLink: notification.deepLink,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...(notification.meta &&
          typeof notification.meta === "object" &&
          !Array.isArray(notification.meta)
            ? Object.fromEntries(
                Object.entries(notification.meta as Record<string, unknown>)
                  .filter(([, value]) => value != null)
                  .map(([key, value]) => [key, String(value)]),
              )
            : {}),
        },
      });

      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: result.skipped
            ? DeliveryStatus.SKIPPED
            : result.failureCount > 0 && result.successCount === 0
              ? DeliveryStatus.FAILED
              : DeliveryStatus.SENT,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
          providerId: result.messageIds?.[0] ?? null,
          errorCode: result.skipped ? "no_devices_or_fcm" : null,
        },
      });
    } catch (error) {
      this.logger.warn(`Push inline failed: ${String(error)}`);
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.FAILED,
          attemptCount: { increment: 1 },
          errorCode: "push_exception",
        },
      });
      throw error;
    }
  }

  private async recordPushSkipped(notificationId: string, errorCode: string) {
    const existing = await this.prisma.notificationDelivery.findFirst({
      where: {
        notificationId,
        channel: NotificationChannel.PUSH,
      },
    });
    if (existing) {
      await this.prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          status: DeliveryStatus.SKIPPED,
          errorCode,
          attemptCount: { increment: 1 },
        },
      });
      return;
    }
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel: NotificationChannel.PUSH,
        status: DeliveryStatus.SKIPPED,
        errorCode,
        attemptCount: 1,
      },
    });
  }
}
