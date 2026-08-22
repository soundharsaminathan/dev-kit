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
import { IsBoolean } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { StudioFeaturesService } from "./studio-features.service";

class UpdateStudioFeatureDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller("studios/:studioId/features")
@UseGuards(AuthGuard, RolesGuard)
export class StudioFeaturesController {
  constructor(
    @Inject(StudioFeaturesService)
    private readonly studioFeatures: StudioFeaturesService,
  ) {}

  @Get()
  list(
    @Param("studioId") studioId: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, studioId);
    }
    return this.studioFeatures.getForStudio(studioId).then((features) => ({
      features,
    }));
  }

  @Patch(":key")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.OWNER)
  update(
    @Param("studioId") studioId: string,
    @Param("key") key: string,
    @Body() dto: UpdateStudioFeatureDto,
    @CurrentUser() user: DecryptedUser,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, studioId);
    }
    return this.studioFeatures.setEnabled(studioId, key, dto.enabled);
  }
}
