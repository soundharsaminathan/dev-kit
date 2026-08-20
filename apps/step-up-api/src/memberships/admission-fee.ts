import {
  InvoiceChargeType,
  InvoiceStatus,
  type Prisma,
} from "@prisma/client";
import { invoiceFeePercents, roundMoney } from "./membership-helpers";

export const ADMISSION_FEE_KIND = "ADMISSION" as const;

export type AdmissionPurchaseMeta = {
  feeKind: typeof ADMISSION_FEE_KIND;
  batchId?: string;
  /** ISO timestamp of the enrollment that triggered this fee (import). */
  enrolledAt?: string;
};

export function readAdmissionFeeAmount(
  settings: { admissionFee?: unknown } | null | undefined,
): number {
  const raw = settings?.admissionFee;
  const amount = roundMoney(Number(raw ?? 0));
  return amount > 0 ? amount : 0;
}

export function isAdmissionPurchaseMeta(
  value: unknown,
): value is AdmissionPurchaseMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const meta = value as Record<string, unknown>;
  return meta.feeKind === ADMISSION_FEE_KIND;
}

export function buildAdmissionInvoiceData(args: {
  studentId: string;
  studioId: string;
  amount: number;
  batchId?: string;
  enrolledAt?: Date;
  status?: InvoiceStatus;
  settings?: {
    platformFeePercent?: number | null;
    gstPercent?: number | null;
  } | null;
}): Prisma.InvoiceCreateManyInput {
  const purchaseMeta: AdmissionPurchaseMeta = {
    feeKind: ADMISSION_FEE_KIND,
    ...(args.batchId ? { batchId: args.batchId } : {}),
    ...(args.enrolledAt ? { enrolledAt: args.enrolledAt.toISOString() } : {}),
  };

  return {
    studentId: args.studentId,
    studioId: args.studioId,
    amount: args.amount,
    status: args.status ?? InvoiceStatus.PENDING,
    chargeType: InvoiceChargeType.ADMISSION,
    membershipId: null,
    ...invoiceFeePercents(args.settings),
    purchaseMeta: purchaseMeta as unknown as Prisma.InputJsonValue,
  };
}
