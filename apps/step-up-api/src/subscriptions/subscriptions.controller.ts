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
import {
  BillingCadence,
  FamilyPack,
  IndividualAudience,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { SubscriptionsService } from "./subscriptions.service";

class CreateSubscriptionDto {
  @IsString()
  studioId!: string;

  @IsString()
  name!: string;

  @IsEnum(SubscriptionKind)
  kind!: SubscriptionKind;

  @ValidateIf(
    (o: CreateSubscriptionDto) => o.kind === SubscriptionKind.INDIVIDUAL,
  )
  @IsEnum(IndividualAudience)
  individualAudience?: IndividualAudience;

  @ValidateIf((o: CreateSubscriptionDto) => o.kind === SubscriptionKind.FAMILY)
  @IsEnum(FamilyPack)
  familyPack?: FamilyPack;

  @IsOptional()
  @IsEnum(BillingCadence)
  billingCadence?: BillingCadence;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BillingCadence)
  billingCadence?: BillingCadence;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller("subscriptions")
@UseGuards(AuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.subscriptionsService.listByStudio(studioId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.subscriptionsService.getById(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(user.id, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param("id") id: string) {
    return this.subscriptionsService.remove(id);
  }
}
