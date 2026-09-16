import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { UserRole } from "../generated/prisma";

export const COMPANY_ADMIN_ROLES: UserRole[] = [
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_ADMIN,
];

export const STAFF_ROLES: UserRole[] = [
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.LOAN_OFFICER,
  UserRole.APPROVER,
  UserRole.COLLECTION_OFFICER,
];

export function requireCompany(user: AuthUser): string {
  if (user.role === UserRole.SYSTEM_ADMIN) {
    throw new BadRequestException("SYSTEM_ADMIN must specify companyId");
  }
  if (!user.companyId) {
    throw new ForbiddenException("User has no company");
  }
  return user.companyId;
}

export function assertSameCompany(user: AuthUser, companyId: string) {
  if (user.role === UserRole.SYSTEM_ADMIN) return;
  if (user.companyId !== companyId) {
    throw new ForbiddenException("Cross-company access denied");
  }
}

export function assertBranchAccess(user: AuthUser, branchId: string) {
  if (
    user.role === UserRole.SYSTEM_ADMIN ||
    user.role === UserRole.COMPANY_OWNER ||
    user.role === UserRole.COMPANY_ADMIN
  ) {
    return;
  }
  if (user.branchId !== branchId) {
    throw new ForbiddenException("Branch access denied");
  }
}

/** Prisma `where` fragment for branch-scoped list queries. */
export function branchWhere(actor: AuthUser): { branchId?: string } {
  if (
    actor.role === UserRole.SYSTEM_ADMIN ||
    actor.role === UserRole.COMPANY_OWNER ||
    actor.role === UserRole.COMPANY_ADMIN
  ) {
    return {};
  }
  if (!actor.branchId) {
    throw new ForbiddenException("User has no branch");
  }
  return { branchId: actor.branchId };
}
