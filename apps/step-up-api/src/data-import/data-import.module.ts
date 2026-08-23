import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { DataImportController } from "./data-import.controller";
import { DataImportService } from "./data-import.service";

@Module({
  imports: [UsersModule, CalendarModule, NotificationsModule],
  controllers: [DataImportController],
  providers: [DataImportService],
  exports: [DataImportService],
})
export class DataImportModule {}
