import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { money } from "../common/money";
import { assertSameCompany } from "../common/tenancy";
import { KycStatus } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { kycDecisionRejection } from "../schedules/domain/lms-rules";
import type {
  CustomerAddressDto,
  CustomerBankAccountDto,
  CustomerEmploymentDto,
  CustomerKycDto,
  CustomerNomineeDto,
  CustomerReferenceDto,
  ReviewKycDto,
} from "./dto/customer-file.dto";

@Injectable()
export class CustomerFileService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async customer(actor: AuthUser, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    assertSameCompany(actor, customer.companyId);
    return customer;
  }

  async addAddress(
    actor: AuthUser,
    customerId: string,
    dto: CustomerAddressDto,
  ) {
    const customer = await this.customer(actor, customerId);
    if (dto.isPrimary) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    const row = await this.prisma.customerAddress.create({
      data: { customerId, ...dto, isPrimary: dto.isPrimary ?? false },
    });
    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.address.create",
      entityType: "CustomerAddress",
      entityId: row.id,
      after: row as never,
    });
    return row;
  }

  async addEmployment(
    actor: AuthUser,
    customerId: string,
    dto: CustomerEmploymentDto,
  ) {
    const customer = await this.customer(actor, customerId);
    if (dto.isCurrent !== false) {
      await this.prisma.customerEmployment.updateMany({
        where: { customerId, isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return this.prisma.customerEmployment.create({
      data: {
        customerId,
        employerName: dto.employerName,
        designation: dto.designation,
        monthlyIncome: money(dto.monthlyIncome),
        isCurrent: dto.isCurrent ?? true,
      },
    });
  }

  async addBankAccount(
    actor: AuthUser,
    customerId: string,
    dto: CustomerBankAccountDto,
  ) {
    await this.customer(actor, customerId);
    if (dto.isPrimary) {
      await this.prisma.customerBankAccount.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.customerBankAccount.create({
      data: { customerId, ...dto, isPrimary: dto.isPrimary ?? false },
    });
  }

  async addNominee(
    actor: AuthUser,
    customerId: string,
    dto: CustomerNomineeDto,
  ) {
    await this.customer(actor, customerId);
    return this.prisma.customerNominee.create({ data: { customerId, ...dto } });
  }

  async addReference(
    actor: AuthUser,
    customerId: string,
    dto: CustomerReferenceDto,
  ) {
    await this.customer(actor, customerId);
    return this.prisma.customerReference.create({
      data: { customerId, ...dto },
    });
  }

  async addKyc(actor: AuthUser, customerId: string, dto: CustomerKycDto) {
    await this.customer(actor, customerId);
    if (dto.expiryDate && dto.issueDate && dto.expiryDate < dto.issueDate) {
      throw new BadRequestException("KYC expiry is before the issue date");
    }
    return this.prisma.customerKyc.create({
      data: {
        customerId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issuingAuthority: dto.issuingAuthority,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async reviewKyc(
    actor: AuthUser,
    customerId: string,
    kycId: string,
    dto: ReviewKycDto,
  ) {
    const customer = await this.customer(actor, customerId);
    const row = await this.prisma.customerKyc.findFirst({
      where: { id: kycId, customerId },
    });
    if (!row) throw new NotFoundException("KYC record not found");
    const rejection = kycDecisionRejection(dto.status, dto.reason);
    if (rejection) throw new BadRequestException(rejection);
    if (row.status !== KycStatus.PENDING) {
      throw new BadRequestException("KYC record is already decided");
    }
    const updated = await this.prisma.customerKyc.update({
      where: { id: kycId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === "REJECTED" ? dto.reason : null,
        verifiedById: actor.id,
        verifiedAt: new Date(),
      },
    });
    await this.audit.append({
      companyId: customer.companyId,
      actorId: actor.id,
      action: "customer.kyc.review",
      entityType: "CustomerKyc",
      entityId: kycId,
      after: { status: updated.status },
      reason: dto.reason,
    });
    return updated;
  }
}
