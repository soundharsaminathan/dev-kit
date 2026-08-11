import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PROJECTION_QUEUE } from "../queue.constants";
import { ProjectionService } from "./projection.service";

type ProjectionJob = {
  batchId?: string;
  studioId?: string;
  invoiceId?: string;
  reason?: string;
};

@Processor(PROJECTION_QUEUE)
export class ProjectionProcessor extends WorkerHost {
  private readonly logger = new Logger(ProjectionProcessor.name);

  constructor(
    @Inject(ProjectionService) private readonly projections: ProjectionService,
  ) {
    super();
  }

  async process(job: Job<ProjectionJob>) {
    if (job.name === "batch-summary" && job.data.batchId) {
      await this.projections.refreshBatchSummary(job.data.batchId);
      return;
    }

    if (job.name === "studio-revenue" && job.data.studioId) {
      await this.projections.refreshStudioRevenue(job.data.studioId);
      return;
    }

    this.logger.warn(`Unknown projection job ${job.name}`);
  }
}
