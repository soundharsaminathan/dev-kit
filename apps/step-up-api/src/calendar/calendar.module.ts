import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { ScheduleConflictService } from "./schedule-conflict.service";

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService, ScheduleConflictService],
  exports: [CalendarService, ScheduleConflictService],
})
export class CalendarModule {}
