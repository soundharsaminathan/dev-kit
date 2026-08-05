import { Module } from "@nestjs/common";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController, JobsSecretGuard } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [NotificationsModule, MembershipsModule],
  controllers: [JobsController],
  providers: [JobsService, JobsSecretGuard],
  exports: [JobsService],
})
export class JobsModule {}
