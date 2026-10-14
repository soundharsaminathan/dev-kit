import { describe, expect, it } from "vitest";
import {
  buildInvoiceReceiptPdf,
  coveredMonthKeys,
  formatInr,
  formatInvoicePeriodLabel,
  invoiceReceiptFileName,
} from "./invoice-receipt-pdf";

describe("invoiceReceiptFileName", () => {
  it("formats username_BillMonth.pdf", () => {
    expect(
      invoiceReceiptFileName({
        studentName: "Asha Kumar",
        billMonth: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe("Asha_Kumar_August2026.pdf");
  });

  it("does not use paidAt as the billing month in the file name", () => {
    expect(
      invoiceReceiptFileName({
        studentName: "Ravi",
        paidAt: "2026-07-15T10:00:00.000Z",
      }),
    ).toBe("Ravi_Unknown.pdf");
  });

  it("uses a first-last month range for quarterly invoices", () => {
    expect(
      invoiceReceiptFileName({
        studentName: "Asha Kumar",
        billMonthKeys: ["2026-06", "2026-07", "2026-08"],
      }),
    ).toBe("Asha_Kumar_June-August2026.pdf");
  });
});

describe("coveredMonthKeys", () => {
  it("lists three months for a quarterly membership", () => {
    expect(
      coveredMonthKeys({
        periodStart: new Date(Date.UTC(2026, 5, 1)),
        billingCadence: "QUARTERLY",
      }),
    ).toEqual(["2026-06", "2026-07", "2026-08"]);
  });
});

describe("formatInvoicePeriodLabel", () => {
  it("joins months in the same year", () => {
    expect(formatInvoicePeriodLabel(["2026-06", "2026-07", "2026-08"])).toBe(
      "June, July, August 2026",
    );
  });
});

describe("formatInr", () => {
  it("uses ASCII Rs so PDFKit Helvetica does not draw ₹ as ¹", () => {
    expect(formatInr(12500)).toBe("Rs 12,500.00");
    expect(formatInr(12500)).not.toContain("₹");
    expect(formatInr(12500)).not.toContain("\u00b9");
  });
});

describe("buildInvoiceReceiptPdf", () => {
  it("builds a PDF receipt", async () => {
    const pdf = await buildInvoiceReceiptPdf({
      invoiceId: "inv_1",
      studentName: "Asha",
      studioName: "Floor One",
      studioAddress: "12 MG Road",
      gstNumber: "22AAAAA0000A1Z5",
      subtotal: 1000,
      referralDiscount: 0,
      studioDiscount: 0,
      gstPercent: 18,
      gstAmount: 180,
      amountPaid: 1000,
      paymentMethod: "UPI_MANUAL",
      paidAt: new Date("2026-09-06T10:00:00.000Z"),
      billMonthKeys: ["2026-09"],
    });

    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
