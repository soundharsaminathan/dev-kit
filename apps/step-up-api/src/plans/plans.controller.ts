import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { BillingCadence, PlanType, UserRole } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { PlansService } from "./plans.service";

class CreatePlanDto {
  @IsString()
  studioId!: string;

  @IsString()
  name!: string;

  @IsEnum(PlanType)
  type!: PlanType;

  @IsOptional()
  @IsEnum(BillingCadence)
  billingCadence?: BillingCadence;

  @IsOptional()
  @IsInt()
  @Min(1)
  classCredits?: number;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BillingCadence)
  billingCadence?: BillingCadence;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  classCredits?: number;
}

@Controller("plans")
@UseGuards(AuthGuard, RolesGuard)
export class PlansController {
  constructor(
    @Inject(PlansService) private readonly plansService: PlansService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(@Param("studioId") studioId: string) {
    return this.plansService.listByStudio(studioId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.plansService.getById(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreatePlanDto) {
    return this.plansService.create(user.id, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(@Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param("id") id: string) {
    return this.plansService.remove(id);
  }
}
