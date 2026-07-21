import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
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
    @Param("trainerId") trainerId: string,
    @Query("studioId") studioId: string,
  ) {
    return this.retentionService.getTrainerStats(trainerId, studioId);
  }
}
