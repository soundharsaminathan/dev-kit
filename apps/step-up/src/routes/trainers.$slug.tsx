import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceTrainerDetailPage } from "@/modules/marketplace/detail";

export const Route = createFileRoute("/trainers/$slug")({
  component: TrainerDetailRoute,
});

function TrainerDetailRoute() {
  const { slug } = Route.useParams();
  return <MarketplaceTrainerDetailPage slug={slug} />;
}
