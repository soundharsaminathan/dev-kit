import { BullModule } from "@nestjs/bullmq";
import { type DynamicModule, forwardRef, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobsModule } from "../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DailyJobsProcessor } from "./processors/daily-jobs.processor";
import { DigestProcessor } from "./processors/digest.processor";
import { NotificationProcessor } from "./processors/notification.processor";
import { NotificationDeliveryService } from "./processors/notification-delivery.service";
import { ProjectionProcessor } from "./processors/projection.processor";
import { ProjectionService } from "./processors/projection.service";
import { PushProcessor } from "./processors/push.processor";
import { RetentionProcessor } from "./processors/retention.processor";
import { ScheduledProcessor } from "./processors/scheduled.processor";
import {
  DAILY_JOBS_QUEUE,
  NOTIFICATION_DELIVER_QUEUE,
  NOTIFICATION_DIGEST_QUEUE,
  NOTIFICATION_PUSH_QUEUE,
  NOTIFICATION_RETENTION_QUEUE,
  NOTIFICATION_SCHEDULED_QUEUE,
  PROJECTION_QUEUE,
} from "./queue.constants";
import { QueueBootstrapService } from "./queue-bootstrap.service";

const queueNames = [
  NOTIFICATION_DELIVER_QUEUE,
  NOTIFICATION_PUSH_QUEUE,
  NOTIFICATION_DIGEST_QUEUE,
  NOTIFICATION_SCHEDULED_QUEUE,
  NOTIFICATION_RETENTION_QUEUE,
  PROJECTION_QUEUE,
  DAILY_JOBS_QUEUE,
];

export type QueueModuleOptions = {
  role: "api" | "worker";
  /** When true, missing REDIS_URL fails startup (worker / production). */
  requireRedis?: boolean;
};

@Module({})
export class QueueModule {
  static forRoot(options: QueueModuleOptions): DynamicModule {
    const redisUrl = process.env.REDIS_URL;
    const logger = new Logger("QueueModule");
    const requireRedis = options.requireRedis ?? options.role === "worker";
    // API + OUTBOX_INLINE: deliver in-process. Skip BullMQ so a slow/unreachable
    // Memorystore cannot block Nest bootstrap (Cloud Run PORT listen timeout).
    const apiInline =
      options.role === "api" && process.env.OUTBOX_INLINE === "true";

    if (!redisUrl || apiInline) {
      if (!redisUrl && requireRedis) {
        throw new Error(
          "REDIS_URL is required for the classa worker (and production queues)",
        );
      }
      if (apiInline) {
        logger.warn(
          "OUTBOX_INLINE=true — BullMQ disabled on API; Redis still used for cache/sockets",
        );
      } else {
        logger.warn(
          "REDIS_URL missing — BullMQ disabled; outbox uses inline delivery",
        );
      }
      return {
        module: QueueModule,
        global: true,
        imports: [forwardRef(() => NotificationsModule)],
        providers: [NotificationDeliveryService, ProjectionService],
        exports: [NotificationDeliveryService, ProjectionService],
      };
    }

    const workerProviders =
      options.role === "worker"
        ? [
            NotificationProcessor,
            PushProcessor,
            DigestProcessor,
            RetentionProcessor,
            ScheduledProcessor,
            ProjectionProcessor,
            DailyJobsProcessor,
            QueueBootstrapService,
          ]
        : [];

    return {
      module: QueueModule,
      global: true,
      imports: [
        ConfigModule,
        forwardRef(() => NotificationsModule),
        ...(options.role === "worker"
          ? [forwardRef(() => JobsModule)]
          : []),
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: {
              url: config.getOrThrow<string>("REDIS_URL"),
              maxRetriesPerRequest: null,
              connectTimeout: 8_000,
              enableOfflineQueue: true,
              retryStrategy: (attempt: number) =>
                Math.min(attempt * 200, 2_000),
            },
            defaultJobOptions: {
              removeOnComplete: 1000,
              removeOnFail: 5000,
            },
          }),
        }),
        BullModule.registerQueue(...queueNames.map((name) => ({ name }))),
      ],
      providers: [
        NotificationDeliveryService,
        ProjectionService,
        ...workerProviders,
      ],
      exports: [NotificationDeliveryService, ProjectionService, BullModule],
    };
  }
}
