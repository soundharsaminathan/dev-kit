import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BodyDto } from "../common/body-dto";
import { UserRole } from "../generated/prisma";
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
  record(
    @CurrentUser() user: AuthUser,
    @BodyDto(RecordPaymentDto) dto: RecordPaymentDto,
  ) {
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
  listByLoan(@CurrentUser() user: AuthUser, @Param("loanId") loanId: string) {
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
    @BodyDto(RequestReversalDto) dto: RequestReversalDto,
  ) {
    return this.payments.requestReversal(user, id, dto);
  }

  @Post(":id/reverse")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
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
    @BodyDto(RequestWaiverDto) dto: RequestWaiverDto,
  ) {
    return this.payments.requestWaiver(user, dto);
  }

  @Post("interest-waiver/request")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.COLLECTION_OFFICER,
  )
  requestInterestWaiver(
    @CurrentUser() user: AuthUser,
    @BodyDto(RequestWaiverDto) dto: RequestWaiverDto,
  ) {
    return this.payments.requestInterestWaiver(user, dto);
  }

  @Post("waiver/execute")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  executeWaiver(
    @CurrentUser() user: AuthUser,
    @BodyDto(RequestWaiverDto) dto: RequestWaiverDto,
  ) {
    return this.payments.executeWaiver(user, dto.installmentId, dto.amount);
  }
}
