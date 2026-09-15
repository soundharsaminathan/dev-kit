import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LoanStatus } from "../generated/prisma";
import type { AuthUser } from "../auth/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { nextSequence, padSeq } from "../common/sequence";
import { requireCompany, assertSameCompany } from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import {
  BlacklistCustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
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

  async list(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(actor: AuthUser, id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException("Customer not found");
    assertSameCompany(actor, customer.companyId);
    return customer;
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
