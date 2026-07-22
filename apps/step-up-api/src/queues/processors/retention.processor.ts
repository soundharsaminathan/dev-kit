import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { NotificationStatus } from "@prisma/client";
import type { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { NOTIFICATION_RETENTION_QUEUE } from "../queue.constants";

@Processor(NOTIFICATION_RETENTION_QUEUE)
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async process(_job: Job) {
    const now = Date.now();
    const archiveCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const deleteCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const softDeleted = await this.prisma.notification.updateMany({
      where: {
        status: NotificationStatus.ARCHIVED,
        archivedAt: { lt: archiveCutoff },
        deletedAt: null,
      },
      data: {
        status: NotificationStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    const hardDeleted = await this.prisma.notification.deleteMany({
      where: {
        status: NotificationStatus.DELETED,
        deletedAt: { lt: deleteCutoff },
      },
    });

    const outboxCleared = await this.prisma.outboxEvent.deleteMany({
      where: {
        publishedAt: { not: null, lt: archiveCutoff },
      },
    });

    this.logger.log(
      `Retention: soft=${softDeleted.count} hard=${hardDeleted.count} outbox=${outboxCleared.count}`,
    );

    return {
      softDeleted: softDeleted.count,
      hardDeleted: hardDeleted.count,
      outboxCleared: outboxCleared.count,
    };
  }
}
