import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { assertSameCompany, requireCompany } from "../common/tenancy";
import {
  ApprovalStatus,
  type ApprovalType,
  type Prisma,
} from "../generated/prisma";
import { NotificationService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ApprovalApplicatorService } from "./approval-applicator.service";
import type { CreateApprovalDto } from "./dto/approval.dto";

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ApprovalApplicatorService)
    private readonly applicator: ApprovalApplicatorService,
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

  async create(maker: AuthUser, dto: CreateApprovalDto) {
    const companyId = requireCompany(maker);
    const request = await this.prisma.approvalRequest.create({
      data: {
        companyId,
        type: dto.type,
        entityType: dto.entityType,
        entityId: dto.entityId,
        payload: dto.payload as Prisma.InputJsonValue,
        reason: dto.reason,
        makerId: maker.id,
        loanId: dto.loanId,
      },
    });
    await this.notifications.enqueueOutbox("approval.create", {
      companyId,
      entityType: "ApprovalRequest",
      entityId: request.id,
      summary: `${request.type} approval pending`,
    });

    await this.audit.append({
      companyId,
      actorId: maker.id,
      action: "approval.create",
      entityType: "ApprovalRequest",
      entityId: request.id,
      after: { type: request.type, entityId: request.entityId },
      reason: dto.reason,
    });
    return request;
  }

  async listPending(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.approvalRequest.findMany({
      where: { companyId, status: ApprovalStatus.PENDING },
      include: { maker: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async approve(checker: AuthUser, id: string, reason?: string) {
    return this.decide(checker, id, ApprovalStatus.APPROVED, reason);
  }

  async reject(checker: AuthUser, id: string, reason?: string) {
    return this.decide(checker, id, ApprovalStatus.REJECTED, reason);
  }

  private async decide(
    checker: AuthUser,
    id: string,
    status: typeof ApprovalStatus.APPROVED | typeof ApprovalStatus.REJECTED,
    reason?: string,
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Approval not found");
    assertSameCompany(checker, request.companyId);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException("Approval already decided");
    }
    if (request.appliedAt) {
      throw new BadRequestException("Approval already applied");
    }
    if (request.makerId === checker.id) {
      throw new BadRequestException("Maker cannot approve own request");
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        checkerId: checker.id,
        decidedAt: new Date(),
        reason: reason ?? request.reason,
      },
    });

    await this.audit.append({
      companyId: request.companyId,
      actorId: checker.id,
      action:
        status === ApprovalStatus.APPROVED
          ? "approval.approve"
          : "approval.reject",
      entityType: "ApprovalRequest",
      entityId: id,
      after: { status },
      reason,
    });

    if (status === ApprovalStatus.APPROVED) {
      await this.applicator.apply(checker, updated);
      return this.prisma.approvalRequest.findUnique({ where: { id } });
    }

    return updated;
  }

  async get(id: string) {
    return this.prisma.approvalRequest.findUnique({ where: { id } });
  }

  async createTyped(
    maker: AuthUser,
    input: {
      type: ApprovalType;
      entityType: string;
      entityId: string;
      payload: Record<string, unknown>;
      reason?: string;
      loanId?: string;
    },
  ) {
    return this.create(maker, input);
  }
}
