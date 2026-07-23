import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";

@Module({
  imports: [CalendarModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
