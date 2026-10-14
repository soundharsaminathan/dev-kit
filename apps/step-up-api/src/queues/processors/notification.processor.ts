import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NOTIFICATION_DELIVER_QUEUE } from "../queue.constants";
import { NotificationDeliveryService } from "./notification-delivery.service";

@Processor(NOTIFICATION_DELIVER_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(NotificationDeliveryService)
    private readonly delivery: NotificationDeliveryService,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string; userId: string }>) {
    this.logger.debug(
      `Delivering notification ${job.data.notificationId} job=${job.id}`,
    );
    return this.delivery.deliver(job.data.notificationId, job.data.userId);
  }
}
