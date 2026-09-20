import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { requireCompany } from "../common/tenancy";
import { OutboxStatus, type Prisma, type UserRole } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async enqueueOutbox(type: string, payload: Prisma.InputJsonValue) {
    return this.prisma.outboxEvent.create({
      data: { type, payload, status: OutboxStatus.PENDING },
    });
  }

  async createInApp(params: {
    companyId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    emailSent?: boolean;
  }) {
    return this.prisma.notification.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId,
        emailSent: params.emailSent ?? false,
      },
    });
  }

  async listMine(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.notification.findMany({
      where: { companyId, userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markRead(actor: AuthUser, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId: actor.id },
    });
    if (!row) return { updated: false };
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { updated: true };
  }

  async markAllRead(actor: AuthUser) {
    const companyId = requireCompany(actor);
    await this.prisma.notification.updateMany({
      where: { companyId, userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: true };
  }

  async notifyCompanyRoles(
    companyId: string,
    roles: UserRole[],
    params: Omit<
      Parameters<NotificationService["createInApp"]>[0],
      "companyId" | "userId"
    >,
  ) {
    const users = await this.prisma.user.findMany({
      where: { companyId, role: { in: roles }, active: true },
      select: { id: true },
    });
    for (const u of users) {
      await this.createInApp({
        companyId,
        userId: u.id,
        ...params,
      });
    }
  }
}
