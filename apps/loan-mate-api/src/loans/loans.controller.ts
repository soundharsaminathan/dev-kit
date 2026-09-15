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
  CreateLoanDto,
  DisburseLoanDto,
  RateChangeDto,
  RejectLoanDto,
} from "./dto/loan.dto";
import { LoansService } from "./loans.service";

@Controller("loans")
@UseGuards(AuthGuard, RolesGuard)
export class LoansController {
  constructor(@Inject(LoansService) private readonly loans: LoansService) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLoanDto) {
    return this.loans.createDraft(user, dto);
  }

  @Get()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  list(@CurrentUser() user: AuthUser) {
    return this.loans.list(user);
  }

  @Get(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.get(user, id);
  }

  @Post(":id/submit")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  submit(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.submit(user, id);
  }

  @Post(":id/verify")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  verify(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.verify(user, id);
  }

  @Post(":id/request-approval")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  requestApproval(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.requestApproval(user, id);
  }

  @Post(":id/approve")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
  )
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.approve(user, id);
  }

  @Post(":id/reject")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
  )
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RejectLoanDto,
  ) {
    return this.loans.reject(user, id, dto);
  }

  @Post(":id/disburse")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  disburse(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: DisburseLoanDto,
  ) {
    return this.loans.disburse(user, id, dto);
  }

  @Post(":id/request-rate-change")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestRateChange(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RateChangeDto,
  ) {
    return this.loans.requestRateChange(user, id, dto);
  }

  @Post(":id/apply-rate-change")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
  )
  applyRateChange(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RateChangeDto,
  ) {
    return this.loans.applyRateChange(user, id, dto);
  }
}
