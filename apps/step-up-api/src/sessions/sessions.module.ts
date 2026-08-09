import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { CalendarModule } from "../calendar/calendar.module";
import { ChatModule } from "../chat/chat.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";
import { TrialSlotsCacheService } from "./trial-slots-cache.service";

@Module({
  imports: [
    AttendanceModule,
    CalendarModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, TrialSlotsCacheService],
  exports: [SessionsService, TrialSlotsCacheService],
})
export class SessionsModule {}
