import { Inject, Injectable, Logger } from "@nestjs/common";
import { OutboxStatus, UserRole } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "./notifications.service";

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

  async processPending(limit = 50) {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let processed = 0;
    for (const event of events) {
      try {
        await this.dispatch(event.type, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        processed += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.FAILED,
            lastError: msg,
            attempts: { increment: 1 },
          },
        });
        this.logger.warn(`Outbox ${event.id} failed: ${msg}`);
      }
    }
    return { processed, total: events.length };
  }

  private async dispatch(type: string, payload: unknown) {
    const p = (payload ?? {}) as Record<string, unknown>;
    const companyId = p.companyId ? String(p.companyId) : null;
    if (!companyId) return;

    const title = this.titleFor(type);
    const body = this.bodyFor(type, p);
    const entityType = p.entityType ? String(p.entityType) : undefined;
    const entityId = p.entityId ? String(p.entityId) : undefined;

    const targetUserId = p.userId ? String(p.userId) : null;
    if (targetUserId) {
      const n = await this.notifications.createInApp({
        companyId,
        userId: targetUserId,
        type,
        title,
        body,
        entityType,
        entityId,
      });
      console.log(`[email-stub] to user ${targetUserId}: ${title} — ${body}`);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { emailSent: true },
      });
      return;
    }

    const roles =
      type === "approval.create"
        ? [UserRole.APPROVER, UserRole.COMPANY_ADMIN, UserRole.COMPANY_OWNER]
        : [
            UserRole.COMPANY_ADMIN,
            UserRole.COMPANY_OWNER,
            UserRole.BRANCH_MANAGER,
          ];

    const users = await this.prisma.user.findMany({
      where: { companyId, role: { in: roles }, active: true },
      select: { id: true },
    });
    for (const u of users) {
      const n = await this.notifications.createInApp({
        companyId,
        userId: u.id,
        type,
        title,
        body,
        entityType,
        entityId,
      });
      console.log(`[email-stub] to user ${u.id}: ${title} — ${body}`);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { emailSent: true },
      });
    }
  }

  private titleFor(type: string) {
    switch (type) {
      case "payment.record":
        return "Payment recorded";
      case "approval.create":
        return "Approval pending";
      case "loan.disburse":
        return "Loan disbursed";
      case "customer.npa_mark":
        return "Customer marked NPA";
      case "customer.npa_clear":
        return "NPA cleared";
      case "loan.close":
        return "Loan closed";
      default:
        return type;
    }
  }

  private bodyFor(type: string, p: Record<string, unknown>) {
    if (p.summary) return String(p.summary);
    if (p.loanNumber) return `Loan ${p.loanNumber}`;
    if (p.receiptNumber) return `Receipt ${p.receiptNumber}`;
    return `Event ${type}`;
  }
}
