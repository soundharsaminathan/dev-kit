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

  onModuleInit() {
    // Do not await Redis here: NestFactory.create waits for OnModuleInit, and
    // a hanging queue.add() means Cloud Run never sees listen() on PORT.
    void this.registerRepeatableJobs();
  }

  private async registerRepeatableJobs() {
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

      // Catch up membership rolls on boot (idempotent). Covers deploys that
      // miss 06:00 UTC, e.g. first worker bring-up mid-month.
      await this.scheduledQueue.add(
        "daily",
        {},
        {
          jobId: `daily-jobs:boot:${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
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
