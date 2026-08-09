import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDiscountInput, printInvoice } from "./print-invoice";

describe("printInvoice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a receipt window and writes printable HTML", () => {
    const write = vi.fn();
    const close = vi.fn();
    const open = vi.fn();
    const popup = {
      opener: window,
      document: { open, write, close },
    };
    const windowOpen = vi
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);

    const opened = printInvoice({
      id: "inv_1",
      amount: 900,
      referralDiscount: 50,
      studioDiscount: 50,
      status: "PAID",
      paymentMethod: "CASH",
      paidAt: "2026-08-01T10:00:00.000Z",
      studentName: "Asha",
      studioName: "Rhythm Studio",
      studioLogoUrl: "https://cdn.example/logo.png",
      studioAddress: "12 MG Road",
      gstNumber: "22AAAAA0000A1Z5",
    });

    expect(opened).toBe(true);
    expect(windowOpen).toHaveBeenCalledWith(
      "",
      "_blank",
      "width=640,height=720",
    );
    expect(popup.opener).toBeNull();
    expect(open).toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    const html = String(write.mock.calls[0]?.[0] ?? "");
    expect(html).toContain("Asha");
    expect(html).toContain("Rhythm Studio");
    expect(html).toContain("https://cdn.example/logo.png");
    expect(html).toContain("GSTIN: 22AAAAA0000A1Z5");
    expect(html).toContain("12 MG Road");
    expect(html).toContain("Amount paid");
    expect(html).toContain("window.print()");
    expect(close).toHaveBeenCalled();
  });

  it("includes family discount on the printed receipt", () => {
    const write = vi.fn();
    const popup = {
      opener: window,
      document: { open: vi.fn(), write, close: vi.fn() },
    };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);

    printInvoice({
      id: "inv_fam",
      amount: 2700,
      familyDiscount: 300,
      status: "PAID",
      studentName: "Ravi",
    });

    const html = String(write.mock.calls[0]?.[0] ?? "");
    expect(html).toContain("Family discount");
    expect(html).toContain("3,000.00");
  });
});

describe("parseDiscountInput", () => {
  it("parses currency-like amounts", () => {
    expect(parseDiscountInput("")).toBe(0);
    expect(parseDiscountInput("12.5")).toBe(12.5);
    expect(parseDiscountInput("-1")).toBeNaN();
    expect(parseDiscountInput("abc")).toBeNaN();
  });
});
