import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  RecordPaymentDto,
  RequestReversalDto,
  RequestWaiverDto,
} from "./dto/payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.COLLECTION_OFFICER,
  )
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordPaymentDto) {
    return this.payments.record(user, dto);
  }

  @Get("loan/:loanId")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.COLLECTION_OFFICER,
    UserRole.APPROVER,
  )
  listByLoan(
    @CurrentUser() user: AuthUser,
    @Param("loanId") loanId: string,
  ) {
    return this.payments.listByLoan(user, loanId);
  }

  @Post(":id/request-reversal")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.COLLECTION_OFFICER,
  )
  requestReversal(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RequestReversalDto,
  ) {
    return this.payments.requestReversal(user, id, dto);
  }

  @Post(":id/reverse")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
  )
  reverse(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.payments.executeReversal(user, id);
  }

  @Post("waiver/request")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.COLLECTION_OFFICER,
  )
  requestWaiver(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestWaiverDto,
  ) {
    return this.payments.requestWaiver(user, dto);
  }

  @Post("waiver/execute")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
  )
  executeWaiver(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestWaiverDto,
  ) {
    return this.payments.executeWaiver(user, dto.installmentId, dto.amount);
  }
}
