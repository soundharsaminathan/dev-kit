import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceStudioDetailPage } from "@/modules/marketplace/detail";

export const Route = createFileRoute("/studios_/$slug")({
  component: StudioDetailRoute,
});

function StudioDetailRoute() {
  const { slug } = Route.useParams();
  return <MarketplaceStudioDetailPage slug={slug} />;
}
