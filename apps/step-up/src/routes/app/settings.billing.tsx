import { createFileRoute } from "@tanstack/react-router";
import { StudioBillingFormPage } from "@/modules/settings/studio-billing-form-page";

export const Route = createFileRoute("/app/settings/billing")({
  component: StudioBillingFormPage,
});
