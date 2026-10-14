import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BodyDto } from "../common/body-dto";
import { UserRole } from "../generated/prisma/client";
import {
  CollateralDto,
  CreateLoanDto,
  DisburseLoanDto,
  GuarantorDto,
  LoanNpaDto,
  PenaltyOverrideDto,
  RateChangeDto,
  RejectLoanDto,
  TrancheDto,
  UpdateLoanAmountsDto,
  VerifyLoanDto,
} from "./dto/loan.dto";
import { LoanExtrasService } from "./loan-extras.service";
import { LoansService } from "./loans.service";

@Controller("loans")
@UseGuards(AuthGuard, RolesGuard)
export class LoansController {
  constructor(
    @Inject(LoansService) private readonly loans: LoansService,
    @Inject(LoanExtrasService) private readonly extras: LoanExtrasService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  create(
    @CurrentUser() user: AuthUser,
    @BodyDto(CreateLoanDto) dto: CreateLoanDto,
  ) {
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

  @Get(":id/schedule")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  schedule(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.schedule(user, id);
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
  verify(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(VerifyLoanDto) dto: VerifyLoanDto,
  ) {
    return this.loans.verify(user, id, dto);
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

  @Patch(":id/amounts")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  updateAmounts(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(UpdateLoanAmountsDto) dto: UpdateLoanAmountsDto,
  ) {
    return this.loans.updateAmounts(user, id, dto);
  }

  @Post(":id/approve")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.loans.approve(user, id);
  }

  @Post(":id/reject")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
  )
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(RejectLoanDto) dto: RejectLoanDto,
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
    @BodyDto(DisburseLoanDto) dto: DisburseLoanDto,
  ) {
    return this.loans.disburse(user, id, dto);
  }

  @Post(":id/request-penalty-override")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestPenaltyOverride(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(PenaltyOverrideDto) dto: PenaltyOverrideDto,
  ) {
    return this.loans.requestPenaltyOverride(
      user,
      id,
      dto.penaltyDailyPercent,
      dto.reason,
    );
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
    @BodyDto(RateChangeDto) dto: RateChangeDto,
  ) {
    return this.loans.requestRateChange(user, id, dto);
  }

  @Post(":id/apply-rate-change")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  applyRateChange(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(RateChangeDto) dto: RateChangeDto,
  ) {
    return this.loans.applyRateChange(user, id, dto);
  }

  @Post(":id/collaterals")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addCollateral(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CollateralDto) dto: CollateralDto,
  ) {
    return this.extras.addCollateral(user, id, dto);
  }

  @Post(":id/guarantors")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addGuarantor(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(GuarantorDto) dto: GuarantorDto,
  ) {
    return this.extras.addGuarantor(user, id, dto);
  }

  @Post(":id/tranches")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  addTranche(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(TrancheDto) dto: TrancheDto,
  ) {
    return this.extras.addTranche(user, id, dto);
  }

  @Post(":id/request-npa")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpa(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(LoanNpaDto) dto: LoanNpaDto,
  ) {
    return this.extras.requestNpa(user, id, dto);
  }

  @Post(":id/request-npa-clear")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpaClear(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.extras.requestNpaClear(user, id, body.reason);
  }
}
