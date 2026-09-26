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
import { UserRole } from "../generated/prisma/client";
import { ApprovalsService } from "./approvals.service";
import { CreateApprovalDto, DecideApprovalDto } from "./dto/approval.dto";

@Controller("approvals")
@UseGuards(AuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.COLLECTION_OFFICER,
  )
  create(
    @CurrentUser() user: AuthUser,
    @BodyDto(CreateApprovalDto) dto: CreateApprovalDto,
  ) {
    return this.approvals.create(user, dto);
  }

  @Get()
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  list(@CurrentUser() user: AuthUser) {
    return this.approvals.listPending(user);
  }

  @Get("pending")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  listPending(@CurrentUser() user: AuthUser) {
    return this.approvals.listPending(user);
  }

  @Get(":id")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.approvals.getForActor(user, id);
  }

  @Post(":id/approve")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(DecideApprovalDto) dto: DecideApprovalDto,
  ) {
    return this.approvals.approve(user, id, dto.reason);
  }

  @Post(":id/reject")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN, UserRole.APPROVER)
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(DecideApprovalDto) dto: DecideApprovalDto,
  ) {
    return this.approvals.reject(user, id, dto.reason);
  }
}
