import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import type { Job } from "bullmq";
import { PreferencesService } from "../../notifications/preferences.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NOTIFICATION_DIGEST_QUEUE } from "../queue.constants";

/**
 * Phase 3 email digest worker.
 * Collects unread high-priority notifications and logs digest payloads.
 * Wire Resend/SES here when EMAIL channel goes live.
 */
@Processor(NOTIFICATION_DIGEST_QUEUE)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PreferencesService)
    private readonly preferences: PreferencesService,
  ) {
    super();
  }

  async process(job: Job<{ userId?: string }>) {
    const where = job.data.userId ? { id: job.data.userId } : {};
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
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
      this.logger.log(
        JSON.stringify({
          channel: "EMAIL",
          provider: "pending",
          userId: user.id,
          count: unread.length,
          types: unread.map((row) => row.type),
        }),
      );

      await this.prisma.notificationDelivery.createMany({
        data: unread.map((row) => ({
          notificationId: row.id,
          channel: NotificationChannel.EMAIL,
          status: "SKIPPED",
          errorCode: "email_provider_not_configured",
          attemptCount: 1,
        })),
      });
    }

    return { digests };
  }
}
