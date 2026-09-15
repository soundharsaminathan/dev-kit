import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma";
import type { AuthUser } from "../auth/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { hashPassword } from "../common/password";
import { assertSameCompany, requireCompany } from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

const STAFF_CREATABLE: UserRole[] = [
  UserRole.COMPANY_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.LOAN_OFFICER,
  UserRole.APPROVER,
  UserRole.COLLECTION_OFFICER,
];

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (dto.role === UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException("Cannot create SYSTEM_ADMIN via API");
    }
    if (
      actor.role !== UserRole.SYSTEM_ADMIN &&
      actor.role !== UserRole.COMPANY_OWNER &&
      actor.role !== UserRole.COMPANY_ADMIN
    ) {
      throw new BadRequestException("Insufficient role to create users");
    }
    if (
      actor.role !== UserRole.SYSTEM_ADMIN &&
      !STAFF_CREATABLE.includes(dto.role) &&
      dto.role !== UserRole.COMPANY_ADMIN
    ) {
      throw new BadRequestException(`Cannot create role ${dto.role}`);
    }

    const companyId =
      actor.role === UserRole.SYSTEM_ADMIN
        ? dto.companyId
        : requireCompany(actor);
    if (!companyId) throw new BadRequestException("companyId required");
    assertSameCompany(actor, companyId);

    const branchScoped: UserRole[] = [
      UserRole.BRANCH_MANAGER,
      UserRole.LOAN_OFFICER,
      UserRole.APPROVER,
      UserRole.COLLECTION_OFFICER,
    ];
    if (dto.branchId && branchScoped.includes(dto.role)) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, companyId },
      });
      if (!branch) throw new BadRequestException("Invalid branchId");
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          role: dto.role,
          companyId,
          branchId: dto.branchId,
          passwordHash: hashPassword(dto.password ?? "changeme"),
        },
      });
      await this.audit.append({
        companyId,
        actorId: actor.id,
        action: "user.create",
        entityType: "User",
        entityId: user.id,
        after: { email: user.email, role: user.role },
      });
      return user;
    } catch {
      throw new ConflictException("Email already exists");
    }
  }

  async list(actor: AuthUser, companyId?: string) {
    const cid =
      actor.role === UserRole.SYSTEM_ADMIN
        ? companyId
        : requireCompany(actor);
    if (!cid) throw new BadRequestException("companyId required");
    assertSameCompany(actor, cid);
    return this.prisma.user.findMany({
      where: { companyId: cid },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (!user.companyId) throw new BadRequestException("Cannot update system user");
    assertSameCompany(actor, user.companyId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        active: dto.active,
        branchId: dto.branchId === null ? null : dto.branchId,
      },
    });
    await this.audit.append({
      companyId: user.companyId,
      actorId: actor.id,
      action: "user.update",
      entityType: "User",
      entityId: id,
      before: { active: user.active, name: user.name },
      after: { active: updated.active, name: updated.name },
    });
    return updated;
  }
}
