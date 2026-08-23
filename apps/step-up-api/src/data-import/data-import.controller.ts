import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FeatureGuard } from "../studio-features/feature.guard";
import { RequireFeature } from "../studio-features/require-feature.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { DataImportService } from "./data-import.service";
import { ImportStudioDataDto } from "./dto/import-studio-data.dto";

@Controller("import")
@UseGuards(AuthGuard, RolesGuard, FeatureGuard)
@RequireFeature("data_import")
export class DataImportController {
  constructor(private readonly dataImport: DataImportService) {}

  @Post("precheck")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  precheckStudioImport(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ImportStudioDataDto,
  ) {
    return this.dataImport.precheckStudioImport(user, dto);
  }

  @Post("jobs")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  startImportJob(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ImportStudioDataDto,
  ) {
    return this.dataImport.startImportJob(user, dto);
  }

  @Get("jobs/:id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  getImportJob(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
  ) {
    return this.dataImport.getImportJob(user, id);
  }

  @Post("studio-data")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  importStudioData(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ImportStudioDataDto,
  ) {
    return this.dataImport.startImportJob(user, dto);
  }
}
