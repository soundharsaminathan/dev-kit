import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { STAFF_ROLES } from "../common/tenancy";
import { type DocumentEntityType, UserRole } from "../generated/prisma";
import { DocumentsService } from "./documents.service";
import type { CreateDocumentDto, SignedUrlDto } from "./dto/document.dto";

@Controller("documents")
@UseGuards(AuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}

  @Post("signed-url")
  @Roles(...STAFF_ROLES)
  signedUrl(@CurrentUser() user: AuthUser, @Body() dto: SignedUrlDto) {
    return this.documents.createSignedUploadUrl(user, dto);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  list(
    @CurrentUser() user: AuthUser,
    @Query("entityType") entityType: DocumentEntityType,
    @Query("entityId") entityId: string,
  ) {
    return this.documents.listByEntity(user, entityType, entityId);
  }

  @Delete(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documents.delete(user, id);
  }
}
