import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalsService } from "../approvals/approvals.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { nextSequence, padSeq } from "../common/sequence";
import { assertSameCompany, requireCompany } from "../common/tenancy";
import { ApprovalType, LoanStatus, UserRole } from "../generated/prisma/client";
import { NotificationService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AssignCollectionOfficerDto,
  BlacklistCustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";

const CUSTOMER_STAFF_SELECT = {
  id: true,
  name: true,
  role: true,
} as const;

const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.COLLECTION_OFFICER,
  UserRole.BRANCH_MANAGER,
];

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

  async create(actor: AuthUser, dto: CreateCustomerDto) {
    const companyId = requireCompany(actor);

    const seq = await nextSequence(this.prisma, "CUST");
    const customerNumber = `CUST-${padSeq(seq)}`;

    try {
      const customer = await this.prisma.customer.create({
        data: {
          companyId,
          customerNumber,
          name: dto.name,
          mobile: dto.mobile,
          pan: dto.pan.toUpperCase(),
          address: dto.address,
          createdById: actor.id,
        },
        include: {
          createdBy: { select: CUSTOMER_STAFF_SELECT },
          collectionOfficer: { select: CUSTOMER_STAFF_SELECT },
        },
      });
      await this.audit.append({
        companyId,
        actorId: actor.id,
        action: "customer.create",
        entityType: "Customer",
        entityId: customer.id,
        after: customer as never,
      });
      return customer;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("mobile") || msg.includes("Customer_companyId_mobile")) {
        throw new ConflictException("Mobile already exists in company");
      }
      if (msg.includes("pan") || msg.includes("Customer_companyId_pan")) {
        throw new ConflictException("PAN already exists in company");
      }
      throw e;
    }
  }

  /** Company-wide list; branch roles see all customers in the company. */
  async list(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.customer.findMany({
      where: { companyId },
      include: {
        createdBy: { select: CUSTOMER_STAFF_SELECT },
        collectionOfficer: { select: CUSTOMER_STAFF_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(actor: AuthUser, id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: CUSTOMER_STAFF_SELECT },
        collectionOfficer: { select: CUSTOMER_STAFF_SELECT },
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    assertSameCompany(actor, customer.companyId);
    return customer;
  }

  async assignCollectionOfficer(
    actor: AuthUser,
    id: string,
    dto: AssignCollectionOfficerDto,
  ) {
    const customer = await this.get(actor, id);
    let collectionOfficerId: string | null = dto.collectionOfficerId;

    if (collectionOfficerId) {
      const officer = await this.prisma.user.findUnique({
        where: { id: collectionOfficerId },
      });
      if (!officer || !officer.active) {
        throw new BadRequestException("Collection officer not found or inactive");
      }
      if (officer.companyId !== customer.companyId) {
        throw new BadRequestException("Officer must belong to the same company");
      }
      if (!ASSIGNABLE_ROLES.includes(officer.role)) {
        throw new BadRequestException(
          "Assignee must be a COLLECTION_OFFICER or BRANCH_MANAGER",
        );
      }
    } else {
      collectionOfficerId = null;
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { collectionOfficerId },
      include: {
        createdBy: { select: CUSTOMER_STAFF_SELECT },
        collectionOfficer: { select: CUSTOMER_STAFF_SELECT },
      },
    });
    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.assign_collection",
      entityType: "Customer",
      entityId: id,
      before: { collectionOfficerId: customer.collectionOfficerId },
      after: { collectionOfficerId: updated.collectionOfficerId },
    });
    return updated;
  }

  async update(actor: AuthUser, id: string, dto: UpdateCustomerDto) {
    const customer = await this.get(actor, id);
    try {
      const updated = await this.prisma.customer.update({
        where: { id },
        data: {
          name: dto.name,
          mobile: dto.mobile,
          pan: dto.pan?.toUpperCase(),
          address: dto.address,
        },
        include: {
          createdBy: { select: CUSTOMER_STAFF_SELECT },
          collectionOfficer: { select: CUSTOMER_STAFF_SELECT },
        },
      });
      await this.audit.append({
        companyId: customer.companyId,
        actorId: actor.id,
        action: "customer.update",
        entityType: "Customer",
        entityId: id,
        before: customer as never,
        after: updated as never,
      });
      return updated;
    } catch {
      throw new ConflictException("Mobile or PAN conflict");
    }
  }

  async blacklist(actor: AuthUser, id: string, dto: BlacklistCustomerDto) {
    const customer = await this.get(actor, id);
    if (dto.blacklisted && !dto.reason) {
      throw new BadRequestException("blacklistReason required");
    }
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        blacklisted: dto.blacklisted,
        blacklistReason: dto.blacklisted ? dto.reason : null,
      },
    });
    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.blacklist",
      entityType: "Customer",
      entityId: id,
      after: {
        blacklisted: updated.blacklisted,
        reason: updated.blacklistReason,
      },
      reason: dto.reason,
    });
    return updated;
  }

  async requestNpaMark(
    actor: AuthUser,
    customerId: string,
    reason: string,
    sourceLoanId?: string,
  ) {
    const customer = await this.get(actor, customerId);
    if (customer.npa) {
      throw new BadRequestException("Customer already NPA");
    }
    return this.approvals.create(actor, {
      type: ApprovalType.NPA_MARK,
      entityType: "Customer",
      entityId: customerId,
      loanId: sourceLoanId,
      payload: { customerId, reason, sourceLoanId },
      reason,
    });
  }

  async requestNpaClear(actor: AuthUser, customerId: string, reason?: string) {
    const customer = await this.get(actor, customerId);
    if (!customer.npa) {
      throw new BadRequestException("Customer is not NPA");
    }
    return this.approvals.create(actor, {
      type: ApprovalType.NPA_CLEAR,
      entityType: "Customer",
      entityId: customerId,
      payload: { customerId },
      reason,
    });
  }

  async executeNpaMark(
    actor: AuthUser,
    customerId: string,
    payload: Record<string, unknown>,
  ) {
    const customer = await this.get(actor, customerId);
    const now = new Date();
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        npa: true,
        npaReason: payload.reason ? String(payload.reason) : "NPA marked",
        npaMarkedAt: now,
        npaClearedAt: null,
        npaSourceLoanId: payload.sourceLoanId
          ? String(payload.sourceLoanId)
          : null,
      },
    });
    await this.notifications.enqueueOutbox("customer.npa_mark", {
      companyId: customer.companyId,
      entityType: "Customer",
      entityId: customerId,
      summary: `Customer ${customer.customerNumber} marked NPA`,
    });

    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.npa_mark",
      entityType: "Customer",
      entityId: customerId,
      after: { npa: true },
    });
    return updated;
  }

  async executeNpaClear(actor: AuthUser, customerId: string) {
    const customer = await this.get(actor, customerId);
    const now = new Date();
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        npa: false,
        npaClearedAt: now,
      },
    });
    await this.notifications.enqueueOutbox("customer.npa_clear", {
      companyId: customer.companyId,
      entityType: "Customer",
      entityId: customerId,
      summary: `NPA cleared for ${customer.customerNumber}`,
    });

    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.npa_clear",
      entityType: "Customer",
      entityId: customerId,
      after: { npa: false },
    });
    return updated;
  }

  async remove(actor: AuthUser, id: string) {
    const customer = await this.get(actor, id);
    const openLoans = await this.prisma.loan.count({
      where: {
        customerId: id,
        status: { not: LoanStatus.CLOSED },
      },
    });
    if (openLoans > 0) {
      throw new BadRequestException(
        "Cannot delete customer with non-CLOSED loans",
      );
    }
    await this.prisma.customer.delete({ where: { id } });
    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.delete",
      entityType: "Customer",
      entityId: id,
      before: customer as never,
    });
    return { deleted: true };
  }
}
