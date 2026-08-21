import { Body, Controller, Post, UseGuards } from "@nestjs/common";
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

  @Post("studio-data")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  importStudioData(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ImportStudioDataDto,
  ) {
    return this.dataImport.importStudioData(user, dto);
  }
}
