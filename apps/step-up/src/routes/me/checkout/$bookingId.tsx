import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/modules/checkout/checkout-page";

export const Route = createFileRoute("/me/checkout/$bookingId")({
  component: CheckoutPage,
});
