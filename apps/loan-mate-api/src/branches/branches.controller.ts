import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BranchesService } from "./branches.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";

@Controller("branches")
@UseGuards(AuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    @Inject(BranchesService) private readonly branches: BranchesService,
  ) {}

  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user, dto);
  }

  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  list(
    @CurrentUser() user: AuthUser,
    @Query("companyId") companyId?: string,
  ) {
    return this.branches.list(user, companyId);
  }

  @Patch(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(user, id, dto);
  }
}
