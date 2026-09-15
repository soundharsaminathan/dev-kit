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
import { UserRole } from "../generated/prisma";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CompaniesService } from "./companies.service";
import {
  CreateCompanyDto,
  UpdateCompanySettingsDto,
} from "./dto/company.dto";

@Controller("companies")
@UseGuards(AuthGuard, RolesGuard)
export class CompaniesController {
  constructor(
    @Inject(CompaniesService) private readonly companies: CompaniesService,
  ) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user, dto);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  list() {
    return this.companies.list();
  }

  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.companies.get(id, user);
  }

  @Patch(":id/settings")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.companies.updateSettings(id, user, dto);
  }
}
