import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";
import {
  NOTIFICATION_DIGEST_QUEUE,
  NOTIFICATION_RETENTION_QUEUE,
  NOTIFICATION_SCHEDULED_QUEUE,
} from "./queue.constants";

@Injectable()
export class QueueBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(QueueBootstrapService.name);

  constructor(
    @InjectQueue(NOTIFICATION_SCHEDULED_QUEUE)
    private readonly scheduledQueue: Queue,
    @InjectQueue(NOTIFICATION_RETENTION_QUEUE)
    private readonly retentionQueue: Queue,
    @InjectQueue(NOTIFICATION_DIGEST_QUEUE)
    private readonly digestQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.scheduledQueue.add(
        "daily",
        {},
        {
          repeat: { pattern: "0 6 * * *" },
          jobId: "notifications-daily",
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      await this.retentionQueue.add(
        "retention",
        {},
        {
          repeat: { pattern: "30 3 * * *" },
          jobId: "notifications-retention",
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      await this.digestQueue.add(
        "digest",
        {},
        {
          repeat: { pattern: "0 18 * * *" },
          jobId: "notifications-digest",
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      this.logger.log("Registered repeatable notification jobs");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Skipped repeatable notification jobs (Redis unavailable): ${message}`,
      );
    }
  }
}
