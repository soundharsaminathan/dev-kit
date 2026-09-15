import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";

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
}
