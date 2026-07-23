import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MediaModule } from "../media/media.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { SessionsModule } from "../sessions/sessions.module";
import { UsersModule } from "../users/users.module";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";

@Module({
  imports: [
    CalendarModule,
    SessionsModule,
    MembershipsModule,
    UsersModule,
    MediaModule,
  ],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
