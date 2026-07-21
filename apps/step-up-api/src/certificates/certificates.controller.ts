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
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
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
  listByStudio(@Param("studioId") studioId: string) {
    return this.certificatesService.listByStudio(studioId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.certificatesService.getById(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@Body() dto: CreateCertificateTemplateDto) {
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
