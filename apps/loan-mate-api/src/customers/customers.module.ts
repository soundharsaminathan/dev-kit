import { forwardRef, Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CustomerFileService } from "./customer-file.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerFileService],
  exports: [CustomersService],
})
export class CustomersModule {}
