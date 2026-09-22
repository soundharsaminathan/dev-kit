import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
import { apiBaseUrl, e2eDatabaseUrl } from "../env";

const apiRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../loan-mate-api",
);

/** Seed password from apps/loan-mate-api/prisma/seed.ts */
export const SEED_PASSWORD = "password";

export const SEED_EMAIL = {
  admin: "admin@loan-mate.local",
  owner: "owner@loan-mate.local",
  companyAdmin: "admin.company@loan-mate.local",
  manager: "branch@loan-mate.local",
  officer: "officer@loan-mate.local",
  approver: "approver@loan-mate.local",
  collector: "collections@loan-mate.local",
} as const;

export type Role = keyof typeof SEED_EMAIL;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  branchId: string | null;
  active: boolean;
};

export type Session = {
  accessToken: string;
  user: SessionUser;
};

export type Customer = {
  id: string;
  customerNumber: string;
  name: string;
  mobile: string;
  pan: string;
  address: string | null;
  blacklisted: boolean;
  blacklistReason: string | null;
  npa: boolean;
  companyId: string;
  collectionOfficerId: string | null;
};

export type Loan = {
  id: string;
  loanNumber: string;
  status: string;
  productOverride: boolean;
  customerId: string;
  branchId: string;
  principal: string | number;
  annualRatePercent: string | number;
  tenureInstallments: number;
  frequency: string;
  penaltyDailyPercent: string | number | null;
  netDisbursement: string | number | null;
  advanceBalance: string | number | null;
  closureType: string | null;
  restructureCount: number;
  rejectionReason: string | null;
};

export type Installment = {
  id: string;
  number: number;
  status: string;
  dueDate: string;
  principalDue: string | number;
  interestDue: string | number;
  penaltyDue: string | number;
  paidPrincipal: string | number;
  paidInterest: string | number;
  paidPenalty: string | number;
};

export type LoanDetail = Loan & {
  dpd: number;
  installments: Installment[];
};

export type Approval = {
  id: string;
  type: string;
  status: string;
  entityId: string;
  makerId: string;
  appliedAt: string | null;
};

export type Payment = {
  id: string;
  receiptNumber: string;
  amount: string | number;
  reversed: boolean;
  loanId: string;
  advanceTreatment: string | null;
};

type Catalog = {
  companyId: string;
  branchId: string;
  productId: string;
};

const sessions = new Map<Role, Session>();
let catalog: Catalog | null = null;
let stamp = 0;

export function uniqueStamp(): string {
  stamp += 1;
  return `${Date.now().toString(36)}${stamp.toString(36)}`;
}

export function uniqueMobile(): string {
  stamp += 1;
  const n = (Date.now() + stamp) % 1_000_000_000;
  return `9${String(n).padStart(9, "0")}`;
}

export function uniquePan(): string {
  stamp += 1;
  const body = (Date.now() + stamp).toString(36).toUpperCase();
  return `Z${body}`
    .replace(/[^A-Z0-9]/g, "X")
    .slice(0, 10)
    .padEnd(10, "A");
}

export function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value ?? 0);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function errorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return String(data ?? "");
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(" ");
  return String(message ?? "");
}

export function installmentRemaining(installment: Installment): number {
  return round2(
    Math.max(
      0,
      num(installment.principalDue) - num(installment.paidPrincipal),
    ) +
      Math.max(
        0,
        num(installment.interestDue) - num(installment.paidInterest),
      ) +
      Math.max(0, num(installment.penaltyDue) - num(installment.paidPenalty)),
  );
}

export function loanOutstanding(loan: LoanDetail): number {
  return round2(
    loan.installments.reduce(
      (sum, installment) => sum + installmentRemaining(installment),
      0,
    ),
  );
}

export async function loginWith(
  email: string,
  password: string,
): Promise<Session> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Login ${email} failed: ${response.status} ${text}`);
  }
  return JSON.parse(text) as Session;
}

export async function login(role: Role): Promise<Session> {
  const cached = sessions.get(role);
  if (cached) return cached;
  const session = await loginWith(SEED_EMAIL[role], SEED_PASSWORD);
  sessions.set(role, session);
  return session;
}

export async function http<T>(
  role: Role | null,
  pathName: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T; ok: boolean; text: string }> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (role) {
    const session = await login(role);
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  const response = await fetch(`${apiBaseUrl}${pathName}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  let data: T;
  try {
    data = (text ? JSON.parse(text) : undefined) as T;
  } catch {
    data = text as T;
  }
  return { status: response.status, data, ok: response.ok, text };
}

export async function expectOk<T>(
  role: Role | null,
  pathName: string,
  init?: RequestInit,
): Promise<T> {
  const result = await http<T>(role, pathName, init);
  expect(
    result.ok,
    `${init?.method ?? "GET"} ${pathName} → ${result.status} ${result.text}`,
  ).toBeTruthy();
  return result.data;
}

export async function expectStatus(
  role: Role | null,
  pathName: string,
  status: number,
  init?: RequestInit,
) {
  const result = await http(role, pathName, init);
  expect(result.status, `${pathName} ${result.text}`).toBe(status);
  return result;
}

export function post(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
}

export function patch(body: unknown): RequestInit {
  return { method: "PATCH", body: JSON.stringify(body) };
}

export async function acme(): Promise<Catalog> {
  if (catalog) return catalog;
  const me = await expectOk<SessionUser>("owner", "/auth/me");
  const branches = await expectOk<Array<{ id: string; code: string }>>(
    "owner",
    "/branches",
  );
  const products = await expectOk<Array<{ id: string; code: string }>>(
    "owner",
    "/products",
  );
  const branch = branches.find((row) => row.code === "HQ");
  const product = products.find((row) => row.code === "PL-STD");
  if (!me.companyId || !branch || !product) {
    throw new Error(
      "Acme seed catalog is missing. The e2e database was not seeded.",
    );
  }
  catalog = {
    companyId: me.companyId,
    branchId: branch.id,
    productId: product.id,
  };
  return catalog;
}

export async function createCustomer(
  options: {
    role?: Role;
    address?: string | null;
    kyc?: boolean;
    name?: string;
  } = {},
): Promise<Customer> {
  const role = options.role ?? "officer";
  const body: Record<string, string> = {
    name: options.name ?? `Flow ${uniqueStamp()}`,
    mobile: uniqueMobile(),
    pan: uniquePan(),
  };
  if (options.address !== null) {
    body.address = options.address ?? "12 Flow Street, Bengaluru";
  }
  const customer = await expectOk<Customer>(role, "/customers", post(body));
  if (options.kyc !== false) {
    await attachKyc(customer.id, role);
  }
  return customer;
}

export async function attachKyc(customerId: string, role: Role = "officer") {
  return expectOk(
    role,
    "/documents",
    post({
      entityType: "CUSTOMER",
      entityId: customerId,
      kind: "KYC_PAN",
      objectKey: `e2e/${customerId}/pan.pdf`,
      fileName: "pan.pdf",
      contentType: "application/pdf",
    }),
  );
}

export async function approvePending(
  type: string,
  entityId: string,
  checker: Role = "approver",
): Promise<Approval> {
  const pending = await expectOk<Approval[]>(checker, "/approvals/pending");
  const match = pending.find(
    (row) =>
      row.type === type &&
      row.entityId === entityId &&
      row.status === "PENDING",
  );
  expect(match, `pending ${type} for ${entityId}`).toBeTruthy();
  return expectOk<Approval>(
    checker,
    `/approvals/${match!.id}/approve`,
    post({}),
  );
}

export async function decide(
  approvalId: string,
  action: "approve" | "reject",
  checker: Role = "approver",
  reason?: string,
) {
  return http<Approval>(
    checker,
    `/approvals/${approvalId}/${action}`,
    post(reason ? { reason } : {}),
  );
}

/** Drain the notification outbox without running the overdue penalty job. */
export function processOutbox(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["exec", "tsx", "scripts/process-outbox-once.ts"],
      {
        cwd: apiRoot,
        shell: true,
        env: {
          ...process.env,
          DATABASE_URL: e2eDatabaseUrl,
          DIRECT_DATABASE_URL: e2eDatabaseUrl,
          AUTH_BYPASS: "true",
        },
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Outbox processor exited ${code}: ${stderr}`));
    });
  });
}
