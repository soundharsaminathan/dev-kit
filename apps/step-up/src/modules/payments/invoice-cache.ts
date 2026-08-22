import type { QueryClient } from "@tanstack/react-query";
import type { Invoice } from "./invoice-types";

export type MarkPaidInvoicePatch = Pick<
  Invoice,
  | "id"
  | "status"
  | "amount"
  | "paymentMethod"
  | "paidAt"
  | "referralDiscount"
  | "studioDiscount"
>;

export function patchStudioInvoiceList(
  queryClient: QueryClient,
  studioId: string,
  patch: MarkPaidInvoicePatch,
) {
  queryClient.setQueryData<Invoice[]>(["invoices", studioId], (current) => {
    if (!current) return current;
    return current.map((invoice) =>
      invoice.id === patch.id ? { ...invoice, ...patch } : invoice,
    );
  });
}

export async function refreshPaymentQueries(
  queryClient: QueryClient,
  studioId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["invoices", studioId] }),
    queryClient.invalidateQueries({ queryKey: ["student-profile", studioId] }),
    queryClient.invalidateQueries({ queryKey: ["studio-families", studioId] }),
    queryClient.invalidateQueries({ queryKey: ["billing", "trainer-analytics"] }),
    queryClient.invalidateQueries({ queryKey: ["billing"] }),
    queryClient.invalidateQueries({ queryKey: ["memberships"] }),
    queryClient.invalidateQueries({ queryKey: ["batches"] }),
  ]);
}
