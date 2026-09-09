import { describe, expect, it } from "vitest";
import {
  findFamilyForStudent,
  householdUnpaidInvoices,
  invoicesCoverMultiplePeople,
  isLinkedFamily,
  shouldOfferFamilyCombine,
} from "./family-combine";
import type { Invoice, StudioFamily } from "./invoice-types";

function invoice(
  partial: Partial<Invoice> & Pick<Invoice, "id" | "studentId">,
): Invoice {
  return {
    amount: 1000,
    status: "PENDING",
    kind: "INDIVIDUAL",
    ...partial,
  };
}

const family: StudioFamily = {
  ownerId: "parent",
  ownerName: "Parent",
  ownerRole: "STUDENT",
  ownerPhotoUrl: null,
  members: [
    { id: "kid-a", name: "Kid A", photoUrl: null, seatRole: "KID" },
    { id: "kid-b", name: "Kid B", photoUrl: null, seatRole: "KID" },
  ],
};

const solo: StudioFamily = {
  ownerId: "solo",
  ownerName: "Solo",
  ownerRole: "STUDENT",
  ownerPhotoUrl: null,
  members: [],
};

describe("isLinkedFamily", () => {
  it("requires at least one linked member", () => {
    expect(isLinkedFamily(family)).toBe(true);
    expect(isLinkedFamily(solo)).toBe(false);
    expect(isLinkedFamily(null)).toBe(false);
  });
});

describe("findFamilyForStudent", () => {
  it("matches owner or member", () => {
    expect(findFamilyForStudent([family], "parent")?.ownerId).toBe("parent");
    expect(findFamilyForStudent([family], "kid-b")?.ownerId).toBe("parent");
    expect(findFamilyForStudent([family], "stranger")).toBeNull();
  });
});

describe("shouldOfferFamilyCombine", () => {
  const kidA = invoice({ id: "inv-a", studentId: "kid-a" });
  const kidB = invoice({ id: "inv-b", studentId: "kid-b" });
  const secondA = invoice({ id: "inv-a2", studentId: "kid-a" });

  it("offers combine for a linked family with two unpaid invoices", () => {
    expect(shouldOfferFamilyCombine(family, [kidA, kidB])).toBe(true);
  });

  it("does not offer combine when both unpaid invoices belong to one member", () => {
    expect(shouldOfferFamilyCombine(family, [kidA, secondA])).toBe(false);
  });

  it("does not offer combine for a student who is not in a family", () => {
    expect(shouldOfferFamilyCombine(null, [kidA, secondA])).toBe(false);
  });

  it("does not offer combine for an owner with no linked members", () => {
    expect(
      shouldOfferFamilyCombine(solo, [
        invoice({ id: "s1", studentId: "solo" }),
        invoice({ id: "s2", studentId: "solo" }),
      ]),
    ).toBe(false);
  });

  it("does not offer combine with only one unpaid invoice", () => {
    expect(shouldOfferFamilyCombine(family, [kidA])).toBe(false);
  });
});

describe("householdUnpaidInvoices", () => {
  it("excludes paid, combined, and non-household invoices", () => {
    const unpaid = householdUnpaidInvoices(
      [
        invoice({ id: "a", studentId: "kid-a" }),
        invoice({ id: "b", studentId: "kid-a", status: "PAID" }),
        invoice({ id: "c", studentId: "stranger" }),
        invoice({ id: "d", studentId: "kid-b", kind: "COMBINED" }),
        invoice({
          id: "e",
          studentId: "parent",
          combineMeta: { sources: [] },
        }),
      ],
      family,
    );
    expect(unpaid.map((row) => row.id)).toEqual(["a"]);
  });
});

describe("invoicesCoverMultiplePeople", () => {
  it("is false when every selected invoice is for the same person", () => {
    expect(
      invoicesCoverMultiplePeople([
        invoice({ id: "a", studentId: "kid-a" }),
        invoice({ id: "b", studentId: "kid-a" }),
      ]),
    ).toBe(false);
  });

  it("is true when selected invoices cover more than one person", () => {
    expect(
      invoicesCoverMultiplePeople([
        invoice({ id: "a", studentId: "kid-a" }),
        invoice({ id: "b", studentId: "kid-b" }),
      ]),
    ).toBe(true);
  });
});
