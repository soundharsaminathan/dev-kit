import { createFileRoute } from "@tanstack/react-router";
import { StudioWizard } from "@/modules/admin/studio-wizard";

export const Route = createFileRoute("/admin/studios/new")({
  component: AdminCreateStudioPage,
});

function AdminCreateStudioPage() {
  return <StudioWizard mode="create" />;
}
