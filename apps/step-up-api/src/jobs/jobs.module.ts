import { Module } from "@nestjs/common";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController, JobsSecretGuard } from "./jobs.controller";
import { JobsService } from "./jobs.service";

/** Shared jobs runner (used by API enqueue + worker processors). */
@Module({
  imports: [NotificationsModule, MembershipsModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsCoreModule {}

@Module({
  imports: [JobsCoreModule],
  controllers: [JobsController],
  providers: [JobsSecretGuard],
  exports: [JobsCoreModule],
})
export class JobsModule {}
