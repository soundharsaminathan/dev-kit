import { createFileRoute } from "@tanstack/react-router";
import { InvoiceCheckoutPage } from "@/modules/checkout/invoice-checkout-page";

export const Route = createFileRoute("/me/checkout/invoice/$invoiceId")({
  component: InvoiceCheckoutPage,
});
