import { Module } from "@nestjs/common";
import { OverdueJobsService } from "./overdue-jobs.service";

@Module({
  providers: [OverdueJobsService],
  exports: [OverdueJobsService],
})
export class JobsModule {}
