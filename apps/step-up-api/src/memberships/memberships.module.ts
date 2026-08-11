import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { MembershipCommandsService } from "./application/membership.commands";
import { MembershipQueriesService } from "./application/membership.queries";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";

@Module({
  imports: [NotificationsModule, UsersModule, CalendarModule],
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    MembershipQueriesService,
    MembershipCommandsService,
  ],
  exports: [
    MembershipsService,
    MembershipQueriesService,
    MembershipCommandsService,
  ],
})
export class MembershipsModule {}
