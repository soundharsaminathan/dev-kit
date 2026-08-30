import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StudioInvoicesController } from "./studio-invoices.controller";
import { StudioInvoicesService } from "./studio-invoices.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [StudioInvoicesController],
  providers: [StudioInvoicesService],
  exports: [StudioInvoicesService],
})
export class StudioInvoicesModule {}
