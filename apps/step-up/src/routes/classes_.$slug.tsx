import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceClassDetailPage } from "@/modules/marketplace/detail";

export const Route = createFileRoute("/classes_/$slug")({
  component: ClassDetailRoute,
});

function ClassDetailRoute() {
  const { slug } = Route.useParams();
  return <MarketplaceClassDetailPage slug={slug} />;
}
