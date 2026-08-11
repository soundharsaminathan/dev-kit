import { getQueueToken } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  Optional,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { JobsOptions, Queue } from "bullmq";
import { NotificationDeliveryService } from "../queues/processors/notification-delivery.service";
import {
  DAILY_JOBS_QUEUE,
  NOTIFICATION_DELIVER_QUEUE,
  PROJECTION_QUEUE,
} from "../queues/queue.constants";
import {
  OUTBOX_EVENT_BATCH_CAPACITY_CHANGED,
  OUTBOX_EVENT_DAILY_JOBS_REQUESTED,
  OUTBOX_EVENT_INVOICE_REFUNDED,
  OUTBOX_EVENT_NOTIFICATION_CREATED,
  OUTBOX_EVENT_PAYMENT_CONFIRMED,
  type BatchCapacityChangedPayload,
  type InvoiceRefundedPayload,
  type PaymentConfirmedPayload,
} from "../shared/outbox-events";
import { OutboxService } from "./outbox.service";

type QueueJob = {
  name: string;
  data: Record<string, unknown>;
  opts: JobsOptions;
};

@Injectable()
export class OutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private deliverQueue: Queue | null = null;
  private projectionQueue: Queue | null = null;
  private dailyJobsQueue: Queue | null = null;

  constructor(
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Optional()
    @Inject(NotificationDeliveryService)
    private readonly delivery: NotificationDeliveryService | null,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.deliverQueue = this.tryGetQueue(NOTIFICATION_DELIVER_QUEUE);
    this.projectionQueue = this.tryGetQueue(PROJECTION_QUEUE);
    this.dailyJobsQueue = this.tryGetQueue(DAILY_JOBS_QUEUE);

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
      const jobsByQueue = new Map<Queue, QueueJob[]>();
      const publishedIds: string[] = [];

      for (const event of events) {
        try {
          const jobs = this.jobsForEvent(event.type, event.id, event.payload);
          if (jobs.length === 0) {
            if (
              event.type === OUTBOX_EVENT_NOTIFICATION_CREATED &&
              !this.deliverQueue &&
              this.delivery
            ) {
              const payload = event.payload as {
                notificationId?: string;
                userId?: string;
              };
              if (payload.notificationId && payload.userId) {
                await this.delivery.deliver(
                  payload.notificationId,
                  payload.userId,
                );
              }
            }
            publishedIds.push(event.id);
            continue;
          }

          for (const { queue, job } of jobs) {
            const list = jobsByQueue.get(queue) ?? [];
            list.push(job);
            jobsByQueue.set(queue, list);
          }
          publishedIds.push(event.id);
        } catch (error) {
          await this.outbox.bumpAttempts(event.id);
          this.logger.warn(
            `Outbox publish failed for ${event.id}: ${String(error)}`,
          );
        }
      }

      await Promise.all(
        [...jobsByQueue.entries()].map(([queue, jobs]) =>
          queue.addBulk(
            jobs.map((job) => ({
              name: job.name,
              data: job.data,
              opts: job.opts,
            })),
          ),
        ),
      );

      if (publishedIds.length > 0) {
        await this.outbox.markPublishedMany(publishedIds);
      }
    } finally {
      this.running = false;
    }
  }

  private tryGetQueue(name: string): Queue | null {
    try {
      return this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
    } catch {
      return null;
    }
  }

  private jobsForEvent(
    type: string,
    eventId: string,
    payload: unknown,
  ): Array<{ queue: Queue; job: QueueJob }> {
    const baseOpts: JobsOptions = {
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    };

    if (type === OUTBOX_EVENT_NOTIFICATION_CREATED) {
      const data = payload as { notificationId?: string; userId?: string };
      if (!data.notificationId || !data.userId || !this.deliverQueue) {
        return [];
      }
      return [
        {
          queue: this.deliverQueue,
          job: {
            name: "deliver",
            data: {
              notificationId: data.notificationId,
              userId: data.userId,
            },
            opts: {
              ...baseOpts,
              jobId: `deliver:${data.notificationId}:${eventId}`,
            },
          },
        },
      ];
    }

    if (type === OUTBOX_EVENT_BATCH_CAPACITY_CHANGED && this.projectionQueue) {
      const data = payload as BatchCapacityChangedPayload;
      return [
        {
          queue: this.projectionQueue,
          job: {
            name: "batch-summary",
            data: { batchId: data.batchId, studioId: data.studioId },
            opts: {
              ...baseOpts,
              jobId: `batch-summary:${data.batchId}:${eventId}`,
            },
          },
        },
      ];
    }

    if (
      (type === OUTBOX_EVENT_PAYMENT_CONFIRMED ||
        type === OUTBOX_EVENT_INVOICE_REFUNDED) &&
      this.projectionQueue
    ) {
      const data = payload as PaymentConfirmedPayload | InvoiceRefundedPayload;
      return [
        {
          queue: this.projectionQueue,
          job: {
            name: "studio-revenue",
            data: {
              studioId: data.studioId,
              invoiceId: data.invoiceId,
              reason: type,
            },
            opts: {
              ...baseOpts,
              jobId: `studio-revenue:${data.studioId}:${eventId}`,
            },
          },
        },
      ];
    }

    if (type === OUTBOX_EVENT_DAILY_JOBS_REQUESTED && this.dailyJobsQueue) {
      return [
        {
          queue: this.dailyJobsQueue,
          job: {
            name: "daily",
            data: {},
            opts: {
              ...baseOpts,
              jobId: `daily-jobs:${eventId}`,
            },
          },
        },
      ];
    }

    return [];
  }
}
