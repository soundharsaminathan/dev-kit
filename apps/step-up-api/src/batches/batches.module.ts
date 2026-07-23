import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { SessionsModule } from "../sessions/sessions.module";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";

@Module({
  imports: [CalendarModule, SessionsModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
