import type { Invoice, StudioFamily } from "./invoice-types";

function isUnpaid(status: Invoice["status"]) {
  return status === "PENDING" || status === "OVERDUE";
}

export function findFamilyForStudent(
  families: StudioFamily[],
  studentId: string,
): StudioFamily | null {
  return (
    families.find(
      (family) =>
        family.ownerId === studentId ||
        family.members.some((member) => member.id === studentId),
    ) ?? null
  );
}

/** Real household: owner plus at least one linked member. */
export function isLinkedFamily(
  family: StudioFamily | null | undefined,
): family is StudioFamily {
  return Boolean(family && family.members.length > 0);
}

export function householdUnpaidInvoices(
  invoices: Invoice[],
  family: StudioFamily,
): Invoice[] {
  const memberIds = new Set<string>([
    family.ownerId,
    ...family.members.map((member) => member.id),
  ]);
  return invoices.filter(
    (invoice) =>
      isUnpaid(invoice.status) &&
      invoice.kind !== "COMBINED" &&
      !invoice.combineMeta &&
      memberIds.has(invoice.studentId),
  );
}

export function invoicesCoverMultiplePeople(invoices: Invoice[]): boolean {
  const studentIds = new Set(invoices.map((invoice) => invoice.studentId));
  return studentIds.size >= 2;
}

/** Combine is only for a linked family with at least two unpaid invoices. */
export function shouldOfferFamilyCombine(
  family: StudioFamily | null,
  invoices: Invoice[],
): family is StudioFamily {
  return (
    isLinkedFamily(family) &&
    householdUnpaidInvoices(invoices, family).length >= 2
  );
}
