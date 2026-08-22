import { createFileRoute } from "@tanstack/react-router";
import { StudioTeamFormPage } from "@/modules/settings/studio-team-form-page";

export const Route = createFileRoute("/app/settings/team")({
  component: StudioTeamFormPage,
});
