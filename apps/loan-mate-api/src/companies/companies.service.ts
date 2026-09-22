import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountingService } from "../accounting/accounting.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { money } from "../common/money";
import { hashPassword } from "../common/password";
import { assertSameCompany } from "../common/tenancy";
import { UserRole } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateCompanyDto,
  UpdateCompanySettingsDto,
} from "./dto/company.dto";

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(AccountingService) private readonly accounting: AccountingService,
  ) {}

  async create(actor: AuthUser, dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException("Company slug already exists");
    }

    const passwordHash = dto.ownerPassword
      ? hashPassword(dto.ownerPassword)
      : hashPassword("changeme");

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          settings: {
            create: {
              graceDays: 0,
              penaltyDailyPercent: money(0.1),
            },
          },
        },
        include: { settings: true },
      });

      await tx.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName,
          role: UserRole.COMPANY_OWNER,
          companyId: created.id,
          passwordHash,
        },
      });

      return created;
    });

    await this.accounting.seedChartOfAccounts(company.id);

    await this.audit.append({
      companyId: company.id,
      actorId: actor.id,
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      after: { name: company.name, slug: company.slug },
    });

    return company;
  }

  async list() {
    return this.prisma.company.findMany({
      include: { settings: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string, actor: AuthUser) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException("Company not found");
    assertSameCompany(actor, company.id);
    return company;
  }

  async updateSettings(
    companyId: string,
    actor: AuthUser,
    dto: UpdateCompanySettingsDto,
  ) {
    assertSameCompany(actor, companyId);
    const before = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    if (!before) throw new NotFoundException("Settings not found");

    const updated = await this.prisma.companySettings.update({
      where: { companyId },
      data: {
        graceDays: dto.graceDays,
        penaltyDailyPercent:
          dto.penaltyDailyPercent !== undefined
            ? money(dto.penaltyDailyPercent)
            : undefined,
        defaultMonthlyFirstEmiOption: dto.defaultMonthlyFirstEmiOption,
        defaultAdvanceTreatments: dto.defaultAdvanceTreatments,
        foreclosureChargePercent:
          dto.foreclosureChargePercent !== undefined
            ? money(dto.foreclosureChargePercent)
            : undefined,
        maxRestructures: dto.maxRestructures,
      },
    });

    await this.audit.append({
      companyId,
      actorId: actor.id,
      action: "company.settings.update",
      entityType: "CompanySettings",
      entityId: updated.id,
      before: before as never,
      after: updated as never,
    });

    return updated;
  }
}
