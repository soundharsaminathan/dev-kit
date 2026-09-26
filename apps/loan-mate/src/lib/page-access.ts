import type { UserRole } from "@/lib/constants";

/** Roles that can open GET /products. Collection officers cannot. */
export const PRODUCT_PAGE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "LOAN_OFFICER",
  "APPROVER",
] as const satisfies readonly UserRole[];

/** Roles that can reject a submitted or verified loan. */
export const LOAN_REJECT_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "LOAN_OFFICER",
  "APPROVER",
] as const satisfies readonly UserRole[];

/** Roles that can approve a verified loan. */
export const LOAN_APPROVE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "APPROVER",
] as const satisfies readonly UserRole[];

/** Roles that can list and decide approvals. */
export const APPROVAL_PAGE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "APPROVER",
] as const satisfies readonly UserRole[];

/** Roles that can record a collection payment. */
export const COLLECTION_PAGE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "COLLECTION_OFFICER",
] as const satisfies readonly UserRole[];

/** Roles that can read the audit log. */
export const AUDIT_PAGE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
] as const satisfies readonly UserRole[];

/** Roles that can read and update company settings. */
export const SETTINGS_PAGE_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
] as const satisfies readonly UserRole[];

/** Roles that can create customers and loan drafts. */
export const ORIGINATION_ROLES = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "LOAN_OFFICER",
] as const satisfies readonly UserRole[];

export function roleAllowed(
  role: UserRole | undefined,
  allowed: readonly UserRole[],
): boolean {
  return role != null && allowed.includes(role);
}
