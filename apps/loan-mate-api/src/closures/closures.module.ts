import { forwardRef, Module } from "@nestjs/common";

import { AccountingModule } from "../accounting/accounting.module";

import { ApprovalsModule } from "../approvals/approvals.module";

import { AuditModule } from "../audit/audit.module";

import { NotificationsModule } from "../notifications/notifications.module";

import { ClosuresController } from "./closures.controller";

import { ClosuresService } from "./closures.service";

import { LoanRestructureService } from "./loan-restructure.service";

@Module({
  imports: [
    AuditModule,

    AccountingModule,

    NotificationsModule,

    forwardRef(() => ApprovalsModule),
  ],

  controllers: [ClosuresController],

  providers: [ClosuresService, LoanRestructureService],

  exports: [ClosuresService, LoanRestructureService],
})
export class ClosuresModule {}
