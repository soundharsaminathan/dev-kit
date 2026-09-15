import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { requireCompany, assertSameCompany } from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";
import { UserRole } from "../generated/prisma";

@Injectable()
export class BranchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private resolveCompanyId(user: AuthUser, companyId?: string): string {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      if (!companyId) throw new NotFoundException("companyId required");
      return companyId;
    }
    return requireCompany(user);
  }

  async create(user: AuthUser, dto: CreateBranchDto) {
    const companyId = this.resolveCompanyId(user, dto.companyId);
    assertSameCompany(user, companyId);

    try {
      const branch = await this.prisma.branch.create({
        data: {
          companyId,
          name: dto.name,
          code: dto.code,
        },
      });
      await this.audit.append({
        companyId,
        actorId: user.id,
        action: "branch.create",
        entityType: "Branch",
        entityId: branch.id,
        after: branch as never,
      });
      return branch;
    } catch {
      throw new ConflictException("Branch code already exists in company");
    }
  }

  async list(user: AuthUser, companyId?: string) {
    const cid = this.resolveCompanyId(user, companyId);
    assertSameCompany(user, cid);
    return this.prisma.branch.findMany({
      where: { companyId: cid },
      orderBy: { name: "asc" },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException("Branch not found");
    assertSameCompany(user, branch.companyId);

    const updated = await this.prisma.branch.update({
      where: { id },
      data: { name: dto.name, active: dto.active },
    });
    await this.audit.append({
      companyId: branch.companyId,
      actorId: user.id,
      action: "branch.update",
      entityType: "Branch",
      entityId: id,
      before: branch as never,
      after: updated as never,
    });
    return updated;
  }
}
