export type UserRole =
  | "SYSTEM_ADMIN"
  | "COMPANY_OWNER"
  | "COMPANY_ADMIN"
  | "BRANCH_MANAGER"
  | "LOAN_OFFICER"
  | "APPROVER"
  | "COLLECTION_OFFICER";

export const SEED_PASSWORD = "password";

export const SEED_USERS: Array<{
  role: UserRole;
  email: string;
  name: string;
  label: string;
}> = [
  {
    role: "SYSTEM_ADMIN",
    email: "admin@loan-mate.local",
    name: "System Admin",
    label: "System Admin",
  },
  {
    role: "COMPANY_OWNER",
    email: "owner@loan-mate.local",
    name: "Company Owner",
    label: "Company Owner",
  },
  {
    role: "COMPANY_ADMIN",
    email: "admin.company@loan-mate.local",
    name: "Company Admin",
    label: "Company Admin",
  },
  {
    role: "BRANCH_MANAGER",
    email: "branch@loan-mate.local",
    name: "Branch Manager",
    label: "Branch Manager",
  },
  {
    role: "LOAN_OFFICER",
    email: "officer@loan-mate.local",
    name: "Loan Officer",
    label: "Loan Officer",
  },
  {
    role: "APPROVER",
    email: "approver@loan-mate.local",
    name: "Approver",
    label: "Approver",
  },
  {
    role: "COLLECTION_OFFICER",
    email: "collections@loan-mate.local",
    name: "Collection Officer",
    label: "Collections",
  },
];

/** Staff roles that use the /app shell (not platform admin). */
export const STAFF_ROLES: UserRole[] = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "LOAN_OFFICER",
  "APPROVER",
  "COLLECTION_OFFICER",
];

export const SYSTEM_ADMIN_ROLES: UserRole[] = ["SYSTEM_ADMIN"];

export function isAuthBypassEnabled() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3010";
}

export function homePathForUser(role: UserRole) {
  if (role === "SYSTEM_ADMIN") {
    return "/admin" as const;
  }
  return "/app" as const;
}

export const SESSION_STORAGE_KEY = "loan-mate-session";

export const PAYMENT_MODES = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "NEFT",
  "RTGS",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const ADVANCE_TREATMENTS = [
  "REDUCE_PRINCIPAL",
  "SKIP_NEXT_EMI",
  "PARK_AS_ADVANCE",
] as const;

export type AdvanceTreatment = (typeof ADVANCE_TREATMENTS)[number];
