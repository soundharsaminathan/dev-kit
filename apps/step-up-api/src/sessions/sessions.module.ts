import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { CalendarModule } from "../calendar/calendar.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [AttendanceModule, CalendarModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
