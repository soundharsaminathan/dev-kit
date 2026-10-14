import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { JobsService } from "../../jobs/jobs.service";
import { NOTIFICATION_SCHEDULED_QUEUE } from "../queue.constants";

@Processor(NOTIFICATION_SCHEDULED_QUEUE)
export class ScheduledProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledProcessor.name);

  constructor(@Inject(JobsService) private readonly jobs: JobsService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Running scheduled notifications job=${job.id}`);
    return this.jobs.runDaily();
  }
}
