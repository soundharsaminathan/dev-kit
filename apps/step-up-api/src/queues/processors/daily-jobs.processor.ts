import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { JobsService } from "../../jobs/jobs.service";
import { DAILY_JOBS_QUEUE } from "../queue.constants";

@Processor(DAILY_JOBS_QUEUE)
export class DailyJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyJobsProcessor.name);

  constructor(@Inject(JobsService) private readonly jobs: JobsService) {
    super();
  }

  async process(_job: Job) {
    this.logger.log("Running daily jobs from queue");
    return this.jobs.runDaily();
  }
}
