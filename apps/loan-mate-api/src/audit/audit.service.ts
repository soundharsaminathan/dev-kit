import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { requireCompany } from "../common/tenancy";
import type { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";

export type AuditListFilters = {
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  action?: string;
};

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async append(input: {
    companyId?: string | null;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    reason?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        companyId: input.companyId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        reason: input.reason,
      },
    });
  }

  async list(actor: AuthUser, filters: AuditListFilters = {}) {
    const companyId = requireCompany(actor);
    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    return this.prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  toCsv(
    rows: Array<{
      id: string;
      createdAt: Date;
      action: string;
      entityType: string;
      entityId: string;
      actorId: string | null;
      reason: string | null;
    }>,
  ): string {
    const header = "id,createdAt,action,entityType,entityId,actorId,reason\n";
    const lines = rows.map((r) => {
      const reason = (r.reason ?? "").replace(/"/g, '""');
      return [
        r.id,
        r.createdAt.toISOString(),
        r.action,
        r.entityType,
        r.entityId,
        r.actorId ?? "",
        `"${reason}"`,
      ].join(",");
    });
    return header + lines.join("\n");
  }
}
