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
    expect(html).toContain("Amount paid");
    expect(html).toContain("window.print()");
    expect(close).toHaveBeenCalled();
  });

  it("returns false when the browser blocks the print window", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(
      printInvoice({
        id: "inv_blocked",
        amount: 100,
        status: "PAID",
      }),
    ).toBe(false);
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
