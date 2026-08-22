import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Invoice } from "./invoice-types";
import { patchStudioInvoiceList } from "./invoice-cache";

const studioId = "studio-1";

const pendingInvoice: Invoice = {
  id: "inv-1",
  studentId: "student-1",
  amount: 1200,
  status: "PENDING",
  kind: "INDIVIDUAL",
  student: { name: "Alex" },
};

describe("patchStudioInvoiceList", () => {
  it("updates the matching invoice to paid in the studio list cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<Invoice[]>(["invoices", studioId], [
      pendingInvoice,
      { ...pendingInvoice, id: "inv-2", studentId: "student-2" },
    ]);

    patchStudioInvoiceList(queryClient, studioId, {
      id: "inv-1",
      status: "PAID",
      amount: 1100,
      paymentMethod: "CASH",
      paidAt: "2026-08-22T10:00:00.000Z",
      referralDiscount: 100,
      studioDiscount: 0,
    });

    const invoices = queryClient.getQueryData<Invoice[]>([
      "invoices",
      studioId,
    ]);
    expect(invoices?.[0]?.status).toBe("PAID");
    expect(invoices?.[0]?.paymentMethod).toBe("CASH");
    expect(invoices?.[1]?.status).toBe("PENDING");
  });
});
