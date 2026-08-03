import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { RetentionService } from "./retention.service";

@Controller("retention")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
export class RetentionController {
  constructor(
    @Inject(RetentionService)
    private readonly retentionService: RetentionService,
  ) {}

  @Get("batch/:batchId")
  batchStats(@Param("batchId") batchId: string) {
    return this.retentionService.getBatchStats(batchId);
  }

  @Get("trainer/:trainerId")
  trainerStats(
    @CurrentUser() user: DecryptedUser,
    @Param("trainerId") trainerId: string,
    @Query("studioId") studioId: string,
  ) {
    if (!studioId) {
      throw new BadRequestException("studioId is required");
    }
    assertSameStudio(user, studioId);
    return this.retentionService.getTrainerStats(trainerId, studioId);
  }
}
