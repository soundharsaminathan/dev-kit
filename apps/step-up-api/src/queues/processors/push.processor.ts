import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { DeliveryStatus } from "@prisma/client";
import type { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { NOTIFICATION_PUSH_QUEUE } from "../queue.constants";
import { NotificationDeliveryService } from "./notification-delivery.service";

@Processor(NOTIFICATION_PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    @Inject(NotificationDeliveryService)
    private readonly delivery: NotificationDeliveryService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(
    job: Job<{ notificationId: string; userId: string; deliveryId: string }>,
  ) {
    this.logger.debug(
      `Push notification ${job.data.notificationId} job=${job.id}`,
    );
    try {
      await this.delivery.sendPushInline(
        job.data.notificationId,
        job.data.userId,
        job.data.deliveryId,
      );
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.prisma.notificationDelivery.update({
          where: { id: job.data.deliveryId },
          data: {
            status: DeliveryStatus.FAILED,
            errorCode: "dlq",
            attemptCount: job.attemptsMade + 1,
          },
        });
        this.logger.error(
          `Push DLQ for ${job.data.notificationId}: ${String(error)}`,
        );
      }
      throw error;
    }
  }
}
