import { getQueueToken } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { Queue } from "bullmq";
import { NotificationDeliveryService } from "../queues/processors/notification-delivery.service";
import {
  NOTIFICATION_DELIVER_QUEUE,
  OUTBOX_EVENT_NOTIFICATION_CREATED,
} from "../queues/queue.constants";
import { OutboxService } from "./outbox.service";

@Injectable()
export class OutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private deliverQueue: Queue | null = null;

  constructor(
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(NotificationDeliveryService)
    private readonly delivery: NotificationDeliveryService,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    try {
      this.deliverQueue = this.moduleRef.get<Queue>(
        getQueueToken(NOTIFICATION_DELIVER_QUEUE),
        { strict: false },
      );
    } catch {
      this.deliverQueue = null;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, 2000);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const events = await this.outbox.claimUnpublished(50);
      for (const event of events) {
        try {
          if (event.type === OUTBOX_EVENT_NOTIFICATION_CREATED) {
            const payload = event.payload as {
              notificationId?: string;
              userId?: string;
            };
            if (payload.notificationId && payload.userId) {
              if (this.deliverQueue) {
                await this.deliverQueue.add(
                  "deliver",
                  {
                    notificationId: payload.notificationId,
                    userId: payload.userId,
                  },
                  {
                    jobId: `deliver:${payload.notificationId}:${event.id}`,
                    attempts: 5,
                    backoff: { type: "exponential", delay: 1000 },
                    removeOnComplete: 1000,
                    removeOnFail: 5000,
                  },
                );
              } else {
                await this.delivery.deliver(
                  payload.notificationId,
                  payload.userId,
                );
              }
            }
          }
          await this.outbox.markPublished(event.id);
        } catch (error) {
          await this.outbox.bumpAttempts(event.id);
          this.logger.warn(
            `Outbox publish failed for ${event.id}: ${String(error)}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
