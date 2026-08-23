import { Inject, Injectable } from "@nestjs/common";
import { OutboxService } from "../../events/outbox.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectionService } from "../../queues/processors/projection.service";
import {
  type BatchCapacityChangedPayload,
  OUTBOX_EVENT_BATCH_CAPACITY_CHANGED,
} from "../../shared/outbox-events";

@Injectable()
export class BatchRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectionService)
    private readonly projections: ProjectionService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}

  /**
   * Sync read-model refresh after a capacity-affecting mutation.
   * Optionally appends an outbox event so the worker can fan out again.
   */
  async refreshSummaryAfterMutation(
    batchId: string,
    options: { appendOutbox?: boolean } = {},
  ) {
    const summary = await this.projections.refreshBatchSummary(batchId);
    if (!summary || options.appendOutbox === false) {
      return summary;
    }

    const payload: BatchCapacityChangedPayload = {
      batchId: summary.batchId,
      studioId: summary.studioId,
    };
    await this.outbox.append(
      this.prisma,
      OUTBOX_EVENT_BATCH_CAPACITY_CHANGED,
      payload,
      { studioId: summary.studioId },
    );
    return summary;
  }
}
