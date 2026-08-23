import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { DataImportController } from "./data-import.controller";
import { DataImportService } from "./data-import.service";
import { ImportLockService } from "./import-lock.service";

@Module({
  imports: [UsersModule, CalendarModule, NotificationsModule],
  controllers: [DataImportController],
  providers: [DataImportService, ImportLockService],
  exports: [DataImportService, ImportLockService],
})
export class DataImportModule {}
