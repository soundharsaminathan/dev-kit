import { createFileRoute } from "@tanstack/react-router";
import { StudioProfileFormPage } from "@/modules/settings/studio-profile-form-page";

export const Route = createFileRoute("/app/settings/profile")({
  component: StudioProfileFormPage,
});
