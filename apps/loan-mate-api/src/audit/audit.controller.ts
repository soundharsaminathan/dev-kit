import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../generated/prisma";
import { AuditService } from "./audit.service";

@Controller("audit")
@UseGuards(AuthGuard, RolesGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  list(
    @CurrentUser() user: AuthUser,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.audit.list(user, {
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get("export")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  @Header("Content-Type", "text/csv")
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query("format") format?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    if (format && format !== "csv") {
      res.status(400).send("Only format=csv is supported");
      return;
    }
    const rows = await this.audit.list(user, {
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="audit-export.csv"',
    );
    res.send(this.audit.toCsv(rows));
  }
}
