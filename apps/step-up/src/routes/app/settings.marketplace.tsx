import { createFileRoute } from "@tanstack/react-router";
import { StudioMarketplacePage } from "@/modules/settings/studio-marketplace-page";

export const Route = createFileRoute("/app/settings/marketplace")({
  component: StudioMarketplacePage,
});
