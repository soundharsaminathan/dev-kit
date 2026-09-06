import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import {
  DeliveryStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";
import type { Job } from "bullmq";
import { EmailService } from "../../email/email.service";
import { PreferencesService } from "../../notifications/preferences.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  UserCryptoService,
  userPiiSelect,
} from "../../users/user-crypto.service";
import { NOTIFICATION_DIGEST_QUEUE } from "../queue.constants";

@Processor(NOTIFICATION_DIGEST_QUEUE)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PreferencesService)
    private readonly preferences: PreferencesService,
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {
    super();
  }

  async process(job: Job<{ userId?: string }>) {
    const where = job.data.userId ? { id: job.data.userId } : {};
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, ...userPiiSelect },
      take: job.data.userId ? 1 : 500,
    });

    let digests = 0;
    for (const user of users) {
      const emailEnabled = await this.preferences.isChannelEnabled(
        user.id,
        "*",
        NotificationChannel.EMAIL,
      );
      if (!emailEnabled) {
        continue;
      }

      const unread = await this.prisma.notification.findMany({
        where: {
          userId: user.id,
          status: NotificationStatus.ACTIVE,
          readAt: null,
          deletedAt: null,
          type: {
            in: ["SUBSCRIPTION_EXPIRING", "PAYMENT_OVERDUE", "NOT_RENEWED"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      if (unread.length === 0) {
        continue;
      }

      digests += 1;

      if (!this.email.isConfigured()) {
        this.logger.log(
          JSON.stringify({
            channel: "EMAIL",
            provider: "smtp",
            userId: user.id,
            count: unread.length,
            status: DeliveryStatus.SKIPPED,
            errorCode: "email_provider_not_configured",
          }),
        );
        await this.prisma.notificationDelivery.createMany({
          data: unread.map((row) => ({
            notificationId: row.id,
            channel: NotificationChannel.EMAIL,
            status: DeliveryStatus.SKIPPED,
            errorCode: "email_provider_not_configured",
            attemptCount: 1,
          })),
        });
        continue;
      }

      let to: string | null = null;
      try {
        to = this.crypto.decryptUser(user).email?.trim() || null;
      } catch (error) {
        this.logger.warn(
          `Digest decrypt failed for ${user.id}: ${error instanceof Error ? error.message : "unknown"}`,
        );
      }

      if (!to) {
        await this.prisma.notificationDelivery.createMany({
          data: unread.map((row) => ({
            notificationId: row.id,
            channel: NotificationChannel.EMAIL,
            status: DeliveryStatus.SKIPPED,
            errorCode: "missing_email",
            attemptCount: 1,
          })),
        });
        continue;
      }

      try {
        await this.email.sendNotificationDigest({
          to,
          items: unread.map((row) => ({
            title: row.title,
            body: row.body,
          })),
        });
        const sentAt = new Date();
        await this.prisma.notificationDelivery.createMany({
          data: unread.map((row) => ({
            notificationId: row.id,
            channel: NotificationChannel.EMAIL,
            status: DeliveryStatus.SENT,
            sentAt,
            attemptCount: 1,
          })),
        });
      } catch (error) {
        const errorCode =
          error instanceof Error ? error.message.slice(0, 120) : "send_failed";
        this.logger.error(`Digest send failed for ${user.id}: ${errorCode}`);
        await this.prisma.notificationDelivery.createMany({
          data: unread.map((row) => ({
            notificationId: row.id,
            channel: NotificationChannel.EMAIL,
            status: DeliveryStatus.FAILED,
            errorCode,
            attemptCount: 1,
          })),
        });
      }
    }

    return { digests };
  }
}
