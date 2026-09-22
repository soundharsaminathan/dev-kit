import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { toNumber } from "../common/money";
import { hashPassword } from "../common/password";
import { assertSameCompany, requireCompany } from "../common/tenancy";
import {
  InstallmentStatus,
  LoanStatus,
  UserRole,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

const STAFF_CREATABLE: UserRole[] = [
  UserRole.COMPANY_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.LOAN_OFFICER,
  UserRole.APPROVER,
  UserRole.COLLECTION_OFFICER,
];

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  branchId: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
        select: USER_PUBLIC_SELECT,
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

    const isManager =
      actor.role === UserRole.SYSTEM_ADMIN ||
      actor.role === UserRole.COMPANY_OWNER ||
      actor.role === UserRole.COMPANY_ADMIN ||
      actor.role === UserRole.BRANCH_MANAGER;

    return this.prisma.user.findMany({
      where: {
        companyId: cid,
        ...(isManager ? {} : { id: actor.id }),
      },
      select: USER_PUBLIC_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async get(actor: AuthUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");
    if (!user.companyId) {
      throw new BadRequestException("Cannot view system user");
    }
    assertSameCompany(actor, user.companyId);
    this.assertCanViewEmployee(actor, user);
    return user;
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
      select: USER_PUBLIC_SELECT,
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

  async performance(
    actor: AuthUser,
    id: string,
    from?: string,
    to?: string,
  ) {
    const user = await this.get(actor, id);
    const range = this.parseDateRange(from, to);
    return this.metricsForUser(user, range);
  }

  async performanceRoster(actor: AuthUser, from?: string, to?: string) {
    const companyId = requireCompany(actor);
    const range = this.parseDateRange(from, to);
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        active: true,
        role: { not: UserRole.SYSTEM_ADMIN },
        ...(actor.role === UserRole.BRANCH_MANAGER && actor.branchId
          ? { branchId: actor.branchId }
          : {}),
      },
      select: USER_PUBLIC_SELECT,
      orderBy: { name: "asc" },
    });

    const rows = [];
    for (const user of users) {
      rows.push(await this.metricsForUser(user, range));
    }
    return rows;
  }

  private assertCanViewEmployee(
    actor: AuthUser,
    target: { id: string; branchId: string | null },
  ) {
    if (actor.id === target.id) return;
    if (
      actor.role === UserRole.SYSTEM_ADMIN ||
      actor.role === UserRole.COMPANY_OWNER ||
      actor.role === UserRole.COMPANY_ADMIN
    ) {
      return;
    }
    if (actor.role === UserRole.BRANCH_MANAGER) {
      if (target.branchId && actor.branchId && target.branchId !== actor.branchId) {
        throw new ForbiddenException("Branch access denied");
      }
      return;
    }
    throw new ForbiddenException("Insufficient role to view employee");
  }

  private parseDateRange(from?: string, to?: string) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid from/to date");
    }
    // Inclusive end-of-day for date-only strings
    const toExclusive = new Date(toDate);
    toExclusive.setHours(23, 59, 59, 999);
    return { from: fromDate, to: toExclusive };
  }

  private async metricsForUser(
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      branchId: string | null;
      active: boolean;
    },
    range: { from: Date; to: Date },
  ) {
    const [leadsGenerated, assignedCustomers, collectedAgg, recordedAgg, assignedLoans] =
      await Promise.all([
        this.prisma.customer.count({
          where: {
            createdById: user.id,
            createdAt: { gte: range.from, lte: range.to },
          },
        }),
        this.prisma.customer.count({
          where: { collectionOfficerId: user.id },
        }),
        this.prisma.payment.aggregate({
          where: {
            reversed: false,
            paymentDate: { gte: range.from, lte: range.to },
            loan: { customer: { collectionOfficerId: user.id } },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            recordedById: user.id,
            reversed: false,
            paymentDate: { gte: range.from, lte: range.to },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.loan.findMany({
          where: {
            customer: { collectionOfficerId: user.id },
            status: {
              in: [LoanStatus.DISBURSED, LoanStatus.ACTIVE, LoanStatus.WRITTEN_OFF],
            },
          },
          include: { installments: true },
        }),
      ]);

    let assignedOutstanding = 0;
    for (const loan of assignedLoans) {
      for (const inst of loan.installments) {
        if (inst.status === InstallmentStatus.PAID) continue;
        assignedOutstanding +=
          Math.max(0, toNumber(inst.principalDue) - toNumber(inst.paidPrincipal)) +
          Math.max(0, toNumber(inst.interestDue) - toNumber(inst.paidInterest)) +
          Math.max(0, toNumber(inst.penaltyDue) - toNumber(inst.paidPenalty));
      }
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      active: user.active,
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
      leadsGenerated,
      assignedCustomers,
      assignedOutstanding: Math.round(assignedOutstanding * 100) / 100,
      collectedAmount: Math.round(toNumber(collectedAgg._sum.amount ?? 0) * 100) / 100,
      collectedCount: collectedAgg._count._all,
      recordedAmount: Math.round(toNumber(recordedAgg._sum.amount ?? 0) * 100) / 100,
      recordedCount: recordedAgg._count._all,
    };
  }
}
