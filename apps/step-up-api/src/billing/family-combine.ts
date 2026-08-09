import { MembershipSeatRole } from "@prisma/client";
import type {
  CoveredStudentInput,
  InvoicePurchaseMeta,
} from "../memberships/memberships.service";

export type CombineSource = {
  invoiceId: string;
  studentId: string;
  batchId: string | null;
  originalAmount: number;
  allocatedDiscount: number;
  netAmount: number;
  membershipId?: string | null;
  purchaseMeta?: InvoicePurchaseMeta | null;
};

export function parsePurchaseMeta(value: unknown): InvoicePurchaseMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const meta = value as Record<string, unknown>;
  if (
    typeof meta.subscriptionId !== "string" ||
    typeof meta.purchaserUserId !== "string" ||
    !Array.isArray(meta.coveredStudents)
  ) {
    return null;
  }

  const coveredStudents: CoveredStudentInput[] = [];
  for (const seat of meta.coveredStudents) {
    if (!seat || typeof seat !== "object" || Array.isArray(seat)) {
      return null;
    }
    const entry = seat as Record<string, unknown>;
    if (
      typeof entry.studentId !== "string" ||
      (entry.seatRole !== MembershipSeatRole.ADULT &&
        entry.seatRole !== MembershipSeatRole.KID)
    ) {
      return null;
    }
    coveredStudents.push({
      studentId: entry.studentId,
      seatRole: entry.seatRole,
      ...(typeof entry.batchId === "string" ? { batchId: entry.batchId } : {}),
    });
  }

  return {
    ...(typeof meta.batchId === "string" ? { batchId: meta.batchId } : {}),
    subscriptionId: meta.subscriptionId,
    purchaserUserId: meta.purchaserUserId,
    coveredStudents,
  };
}

/** Prefer invoice batch metadata; only fall back to a single unambiguous enrollment. */
export function batchIdsForInvoiceAttribution(args: {
  studentId: string;
  purchaseMeta?: InvoicePurchaseMeta | null;
  studentBatchMap: Map<string, Set<string>>;
}): string[] {
  if (args.purchaseMeta?.batchId) {
    return [args.purchaseMeta.batchId];
  }

  const fromSeats = [
    ...new Set(
      (args.purchaseMeta?.coveredStudents ?? [])
        .map((seat) => seat.batchId)
        .filter((batchId): batchId is string => typeof batchId === "string"),
    ),
  ];
  if (fromSeats.length > 0) {
    return fromSeats;
  }

  const enrolled = [...(args.studentBatchMap.get(args.studentId) ?? [])];
  if (enrolled.length === 1) {
    return enrolled;
  }
  return [];
}

export type InvoiceCombineMeta = {
  sources: CombineSource[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Proportional family discount; last row absorbs remainder so cents sum exactly. */
export function allocateFamilyDiscount(
  amounts: number[],
  familyDiscount: number,
): number[] {
  const subtotal = roundMoney(amounts.reduce((sum, amount) => sum + amount, 0));
  if (amounts.length === 0) {
    return [];
  }
  if (familyDiscount < 0) {
    throw new Error("Family discount cannot be negative");
  }
  if (familyDiscount > subtotal) {
    throw new Error("Family discount cannot exceed invoice total");
  }
  if (subtotal === 0) {
    return amounts.map(() => 0);
  }

  const allocated: number[] = [];
  let remaining = familyDiscount;
  for (let index = 0; index < amounts.length; index += 1) {
    if (index === amounts.length - 1) {
      allocated.push(roundMoney(remaining));
      break;
    }
    const share = roundMoney((familyDiscount * amounts[index]!) / subtotal);
    allocated.push(share);
    remaining = roundMoney(remaining - share);
  }
  return allocated;
}

export function parseCombineMeta(value: unknown): InvoiceCombineMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const meta = value as Record<string, unknown>;
  if (!Array.isArray(meta.sources)) {
    return null;
  }

  const sources: CombineSource[] = [];
  for (const entry of meta.sources) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }
    const row = entry as Record<string, unknown>;
    if (
      typeof row.invoiceId !== "string" ||
      typeof row.studentId !== "string" ||
      typeof row.originalAmount !== "number" ||
      typeof row.allocatedDiscount !== "number" ||
      typeof row.netAmount !== "number"
    ) {
      return null;
    }
    sources.push({
      invoiceId: row.invoiceId,
      studentId: row.studentId,
      batchId: typeof row.batchId === "string" ? row.batchId : null,
      originalAmount: row.originalAmount,
      allocatedDiscount: row.allocatedDiscount,
      netAmount: row.netAmount,
      ...(typeof row.membershipId === "string"
        ? { membershipId: row.membershipId }
        : row.membershipId === null
          ? { membershipId: null }
          : {}),
      ...(row.purchaseMeta &&
      typeof row.purchaseMeta === "object" &&
      !Array.isArray(row.purchaseMeta)
        ? { purchaseMeta: row.purchaseMeta as InvoicePurchaseMeta }
        : {}),
    });
  }

  return { sources };
}

/** Batch ids that should receive credit for this invoice amount split. */
export function attributionTargetsForInvoice(args: {
  studentId: string;
  combineMeta: InvoiceCombineMeta | null;
  purchaseMeta?: InvoicePurchaseMeta | null;
  studentBatchMap: Map<string, Set<string>>;
  amount: number;
  status: string;
}): Array<{ batchId: string; amount: number; studentId: string }> {
  const meta = args.combineMeta;
  if (meta && meta.sources.length > 0) {
    const targets: Array<{
      batchId: string;
      amount: number;
      studentId: string;
    }> = [];
    for (const source of meta.sources) {
      const credit = source.netAmount;
      const batchIds = source.batchId
        ? [source.batchId]
        : batchIdsForInvoiceAttribution({
            studentId: source.studentId,
            purchaseMeta: source.purchaseMeta ?? null,
            studentBatchMap: args.studentBatchMap,
          });
      for (const batchId of batchIds) {
        targets.push({
          batchId,
          amount: credit,
          studentId: source.studentId,
        });
      }
    }
    return targets;
  }

  const batchIds = batchIdsForInvoiceAttribution({
    studentId: args.studentId,
    purchaseMeta: args.purchaseMeta ?? null,
    studentBatchMap: args.studentBatchMap,
  });
  return batchIds.map((batchId) => ({
    batchId,
    amount: args.amount,
    studentId: args.studentId,
  }));
}
