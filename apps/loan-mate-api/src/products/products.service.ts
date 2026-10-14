import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { money } from "../common/money";
import { requireCompany, assertSameCompany } from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(actor: AuthUser, dto: CreateProductDto) {
    const companyId = requireCompany(actor);
    try {
      const product = await this.prisma.loanProduct.create({
        data: {
          companyId,
          name: dto.name,
          code: dto.code,
          defaultPrincipal: money(dto.defaultPrincipal),
          defaultAnnualRate: money(dto.defaultAnnualRate),
          annualRateWeekly:
            dto.annualRateWeekly !== undefined
              ? money(dto.annualRateWeekly)
              : undefined,
          annualRateBiweekly:
            dto.annualRateBiweekly !== undefined
              ? money(dto.annualRateBiweekly)
              : undefined,
          annualRateMonthly:
            dto.annualRateMonthly !== undefined
              ? money(dto.annualRateMonthly)
              : undefined,
          defaultTenure: dto.defaultTenure,
          defaultFrequency: dto.defaultFrequency,
          defaultMonthlyFirstEmi: dto.defaultMonthlyFirstEmi,
          processingFeePercent: money(dto.processingFeePercent ?? 0),
        },
      });
      await this.audit.append({
        companyId,
        actorId: actor.id,
        action: "product.create",
        entityType: "LoanProduct",
        entityId: product.id,
        after: product as never,
      });
      return product;
    } catch {
      throw new ConflictException("Product code already exists");
    }
  }

  async list(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.loanProduct.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    assertSameCompany(actor, product.companyId);

    const updated = await this.prisma.loanProduct.update({
      where: { id },
      data: {
        name: dto.name,
        defaultPrincipal:
          dto.defaultPrincipal !== undefined
            ? money(dto.defaultPrincipal)
            : undefined,
        defaultAnnualRate:
          dto.defaultAnnualRate !== undefined
            ? money(dto.defaultAnnualRate)
            : undefined,
        defaultTenure: dto.defaultTenure,
        defaultFrequency: dto.defaultFrequency,
        defaultMonthlyFirstEmi: dto.defaultMonthlyFirstEmi,
        processingFeePercent:
          dto.processingFeePercent !== undefined
            ? money(dto.processingFeePercent)
            : undefined,
        active: dto.active,
      },
    });
    await this.audit.append({
      companyId: product.companyId,
      actorId: actor.id,
      action: "product.update",
      entityType: "LoanProduct",
      entityId: id,
      before: product as never,
      after: updated as never,
    });
    return updated;
  }
}
