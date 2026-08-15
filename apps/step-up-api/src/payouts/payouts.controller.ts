import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { PayoutsService } from "./payouts.service";

class UpdatePayoutDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

@Controller("payouts")
@UseGuards(AuthGuard, RolesGuard)
export class PayoutsController {
  constructor(
    @Inject(PayoutsService) private readonly payoutsService: PayoutsService,
  ) {}

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  list(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    return this.payoutsService.list(user, studioId);
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getById(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.payoutsService.getById(user, id);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateDraft(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.payoutsService.updateDraft(user, id, dto);
  }

  @Patch(":id/send")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  send(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.payoutsService.send(user, id);
  }

  @Patch(":id/paid")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  markPaid(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.payoutsService.markPaid(user, id);
  }
}
