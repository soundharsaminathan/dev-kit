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
import { UserRole } from "@prisma/client";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { StudioInvoicesService } from "./studio-invoices.service";

class CreateStudioInvoiceDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsIn(["BASIC", "ADVANCED"])
  plan?: "BASIC" | "ADVANCED";

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  discount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

class UpdateStudioInvoiceDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsIn(["BASIC", "ADVANCED"])
  plan?: "BASIC" | "ADVANCED";

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  discount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

class MarkPaidDto {
  @IsIn(["CASH", "UPI_MANUAL"])
  paymentMethod!: "CASH" | "UPI_MANUAL";
}

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class StudioInvoicesController {
  constructor(
    @Inject(StudioInvoicesService)
    private readonly studioInvoices: StudioInvoicesService,
  ) {}

  @Get("studios/:studioId/usage")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.OWNER)
  getUsage(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query("month") month?: string,
  ) {
    return this.studioInvoices.getUsage(user, studioId, month);
  }

  @Get("studios/:studioId/studio-invoices")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.OWNER)
  list(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    return this.studioInvoices.list(user, studioId);
  }

  @Post("studios/:studioId/studio-invoices")
  @Roles(UserRole.SYSTEM_ADMIN)
  create(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Body() dto: CreateStudioInvoiceDto,
  ) {
    return this.studioInvoices.create(user, studioId, dto);
  }

  @Patch("studio-invoices/:id")
  @Roles(UserRole.SYSTEM_ADMIN)
  update(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateStudioInvoiceDto,
  ) {
    return this.studioInvoices.update(user, id, dto);
  }

  @Post("studio-invoices/:id/publish")
  @Roles(UserRole.SYSTEM_ADMIN)
  publish(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.studioInvoices.publish(user, id);
  }

  @Post("studio-invoices/:id/paid")
  @Roles(UserRole.SYSTEM_ADMIN)
  markPaid(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.studioInvoices.markPaid(user, id, dto.paymentMethod);
  }

  @Post("studio-invoices/:id/void")
  @Roles(UserRole.SYSTEM_ADMIN)
  voidInvoice(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.studioInvoices.void(user, id);
  }
}
