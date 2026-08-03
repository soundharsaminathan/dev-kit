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
import { UserRole } from "@prisma/client";
import { IsObject, IsOptional, IsString, MinLength } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { CertificatesService } from "./certificates.service";

class CreateCertificateTemplateDto {
  @IsString()
  studioId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsObject()
  layoutJson!: Record<string, unknown>;
}

class UpdateCertificateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsObject()
  layoutJson?: Record<string, unknown>;
}

@Controller("certificate-templates")
@UseGuards(AuthGuard, RolesGuard)
export class CertificatesController {
  constructor(
    @Inject(CertificatesService)
    private readonly certificatesService: CertificatesService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.certificatesService.listByStudio(studioId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.certificatesService.getById(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateCertificateTemplateDto,
  ) {
    assertSameStudio(user, dto.studioId);
    return this.certificatesService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(@Param("id") id: string, @Body() dto: UpdateCertificateTemplateDto) {
    return this.certificatesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param("id") id: string) {
    return this.certificatesService.remove(id);
  }
}
