import { BullModule } from "@nestjs/bullmq";
import { type DynamicModule, forwardRef, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobsModule } from "../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DigestProcessor } from "./processors/digest.processor";
import { NotificationProcessor } from "./processors/notification.processor";
import { NotificationDeliveryService } from "./processors/notification-delivery.service";
import { PushProcessor } from "./processors/push.processor";
import { RetentionProcessor } from "./processors/retention.processor";
import { ScheduledProcessor } from "./processors/scheduled.processor";
import {
  NOTIFICATION_DELIVER_QUEUE,
  NOTIFICATION_DIGEST_QUEUE,
  NOTIFICATION_PUSH_QUEUE,
  NOTIFICATION_RETENTION_QUEUE,
  NOTIFICATION_SCHEDULED_QUEUE,
} from "./queue.constants";
import { QueueBootstrapService } from "./queue-bootstrap.service";

const queueNames = [
  NOTIFICATION_DELIVER_QUEUE,
  NOTIFICATION_PUSH_QUEUE,
  NOTIFICATION_DIGEST_QUEUE,
  NOTIFICATION_SCHEDULED_QUEUE,
  NOTIFICATION_RETENTION_QUEUE,
];

@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;
    const logger = new Logger("QueueModule");

    if (!redisUrl) {
      logger.warn(
        "REDIS_URL missing — BullMQ disabled; outbox uses inline delivery",
      );
      return {
        module: QueueModule,
        global: true,
        imports: [forwardRef(() => NotificationsModule)],
        providers: [NotificationDeliveryService],
        exports: [NotificationDeliveryService],
      };
    }

    return {
      module: QueueModule,
      global: true,
      imports: [
        ConfigModule,
        forwardRef(() => NotificationsModule),
        forwardRef(() => JobsModule),
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
        NotificationProcessor,
        PushProcessor,
        DigestProcessor,
        RetentionProcessor,
        ScheduledProcessor,
        QueueBootstrapService,
      ],
      exports: [NotificationDeliveryService, BullModule],
    };
  }
}
