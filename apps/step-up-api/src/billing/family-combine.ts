import {
  BillingCadence,
  InvoiceStatus,
  MembershipSeatRole,
  Prisma,
} from "@prisma/client";
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

export type InvoiceCombineMeta = {
  sources: CombineSource[];
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
    ...(meta.firstMonthConvertToQuarterly === true
      ? { firstMonthConvertToQuarterly: true }
      : {}),
  };
}

/** Batch id from purchaseMeta, including import/partial JSON shapes. */
export function readPurchaseMetaBatchId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const meta = value as Record<string, unknown>;
  if (typeof meta.batchId === "string" && meta.batchId.length > 0) {
    return meta.batchId;
  }
  if (!Array.isArray(meta.coveredStudents)) {
    return null;
  }
  for (const seat of meta.coveredStudents) {
    if (!seat || typeof seat !== "object" || Array.isArray(seat)) {
      continue;
    }
    const entry = seat as Record<string, unknown>;
    if (typeof entry.batchId === "string" && entry.batchId.length > 0) {
      return entry.batchId;
    }
  }
  return null;
}

/** Subscription id from purchaseMeta, including import/partial JSON shapes. */
export function readPurchaseMetaSubscriptionId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const meta = value as Record<string, unknown>;
  return typeof meta.subscriptionId === "string" &&
    meta.subscriptionId.length > 0
    ? meta.subscriptionId
    : null;
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

/** Batch ids to show on invoice cards (primary meta, seats, combine sources, or single enrollment). */
export function batchIdsForInvoiceDisplay(args: {
  studentId: string;
  purchaseMeta?: InvoicePurchaseMeta | null;
  combineMeta?: InvoiceCombineMeta | null;
  studentBatchMap: Map<string, Set<string>>;
}): string[] {
  if (args.combineMeta?.sources.length) {
    const fromSources = [
      ...new Set(
        args.combineMeta.sources.flatMap((source) => {
          if (source.batchId) {
            return [source.batchId];
          }
          return batchIdsForInvoiceAttribution({
            studentId: source.studentId,
            purchaseMeta: source.purchaseMeta ?? null,
            studentBatchMap: args.studentBatchMap,
          });
        }),
      ),
    ];
    if (fromSources.length > 0) {
      return fromSources;
    }
  }

  return batchIdsForInvoiceAttribution({
    studentId: args.studentId,
    purchaseMeta: args.purchaseMeta ?? null,
    studentBatchMap: args.studentBatchMap,
  });
}

export function batchLabelForInvoice(args: {
  studentId: string;
  purchaseMeta?: InvoicePurchaseMeta | null;
  combineMeta?: InvoiceCombineMeta | null;
  studentBatchMap: Map<string, Set<string>>;
  batchNameById: Map<string, string>;
}): { batchId: string | null; batchName: string | null } {
  const batchIds = batchIdsForInvoiceDisplay(args);
  const names = batchIds
    .map((batchId) => args.batchNameById.get(batchId))
    .filter((name): name is string => Boolean(name));
  return {
    batchId: batchIds[0] ?? null,
    batchName: names.length > 0 ? names.join(" · ") : null,
  };
}

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

export function monthsForBillingCadence(
  cadence: BillingCadence | string | null | undefined,
) {
  return cadence === BillingCadence.QUARTERLY ? 3 : 1;
}

export type PaidMonthsInvoice = {
  studentId: string;
  combineMeta?: unknown;
  purchaseMeta?: unknown;
  membership?: {
    subscription?: { billingCadence?: BillingCadence | string | null } | null;
  } | null;
};

/** Prisma select for paid-months aggregation (includes family-combine sources). */
export const paidMonthsInvoiceSelect = {
  studentId: true,
  combineMeta: true,
  purchaseMeta: true,
  membership: {
    select: {
      subscription: { select: { billingCadence: true } },
    },
  },
} as const;

type PaidMonthsDb = {
  invoice: {
    findMany: (args: {
      where: Prisma.InvoiceWhereInput;
      select: typeof paidMonthsInvoiceSelect;
    }) => Promise<PaidMonthsInvoice[]>;
  };
  subscription: {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: { id: true; billingCadence: true };
    }) => Promise<Array<{ id: string; billingCadence: BillingCadence | string }>>;
  };
};

function cadenceForPaidInvoice(
  invoice: PaidMonthsInvoice,
  cadenceBySubscriptionId?: ReadonlyMap<string, BillingCadence | string>,
) {
  const subscriptionId = readPurchaseMetaSubscriptionId(invoice.purchaseMeta);
  if (subscriptionId && cadenceBySubscriptionId?.has(subscriptionId)) {
    return cadenceBySubscriptionId.get(subscriptionId);
  }
  return invoice.membership?.subscription?.billingCadence;
}

/** Look up billing cadence for purchaseMeta.subscriptionId (import plan, not linked membership). */
export async function resolvePlanCadenceBySubscriptionId(
  prisma: Pick<PaidMonthsDb, "subscription">,
  invoices: PaidMonthsInvoice[],
): Promise<Map<string, BillingCadence | string>> {
  const ids = [
    ...new Set(
      invoices
        .map((invoice) => readPurchaseMetaSubscriptionId(invoice.purchaseMeta))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await prisma.subscription.findMany({
    where: { id: { in: ids } },
    select: { id: true, billingCadence: true },
  });
  return new Map(rows.map((row) => [row.id, row.billingCadence]));
}

/** Load PAID invoices billed to students or covering them via combineMeta.sources. */
export function paidMonthsInvoiceWhere(
  studioId: string,
  studentIds: string[],
): Prisma.InvoiceWhereInput {
  return {
    studioId,
    status: InvoiceStatus.PAID,
    OR: [
      { studentId: { in: studentIds } },
      { combineMeta: { not: Prisma.DbNull } },
    ],
  };
}

/**
 * Attribute paid months per student. Combined family invoices credit each
 * combineMeta source (not only invoice.studentId / the household purchaser).
 */
export function accumulatePaidMonths(
  invoices: PaidMonthsInvoice[],
  options?: {
    onlyStudentIds?: ReadonlySet<string>;
    cadenceBySubscriptionId?: ReadonlyMap<string, BillingCadence | string>;
  },
): Map<string, number> {
  const paidMonthsByStudent = new Map<string, number>();
  const only = options?.onlyStudentIds;

  const credit = (studentId: string, months: number) => {
    if (only && !only.has(studentId)) return;
    paidMonthsByStudent.set(
      studentId,
      (paidMonthsByStudent.get(studentId) ?? 0) + months,
    );
  };

  for (const invoice of invoices) {
    const combineMeta = parseCombineMeta(invoice.combineMeta);
    if (combineMeta && combineMeta.sources.length > 0) {
      for (const source of combineMeta.sources) {
        credit(source.studentId, 1);
      }
      continue;
    }
    credit(
      invoice.studentId,
      monthsForBillingCadence(
        cadenceForPaidInvoice(invoice, options?.cadenceBySubscriptionId),
      ),
    );
  }

  return paidMonthsByStudent;
}

/** Paid-month totals using each invoice's plan (purchaseMeta), not the linked membership. */
export async function loadPaidMonthsByStudent(
  prisma: PaidMonthsDb,
  studioId: string,
  studentIds: readonly string[],
): Promise<Map<string, number>> {
  if (studentIds.length === 0) {
    return new Map();
  }
  const ids = [...studentIds];
  const invoices = await prisma.invoice.findMany({
    where: paidMonthsInvoiceWhere(studioId, ids),
    select: paidMonthsInvoiceSelect,
  });
  const cadenceBySubscriptionId = await resolvePlanCadenceBySubscriptionId(
    prisma,
    invoices,
  );
  return accumulatePaidMonths(invoices, {
    onlyStudentIds: new Set(ids),
    cadenceBySubscriptionId,
  });
}
