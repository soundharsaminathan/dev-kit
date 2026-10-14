import { forwardRef, Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [
    AuditModule,
    AccountingModule,
    NotificationsModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
