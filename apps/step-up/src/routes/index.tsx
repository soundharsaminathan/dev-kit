import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceLanding } from "@/modules/marketplace/landing";

export const Route = createFileRoute("/")({
  component: MarketplaceIndexPage,
});

function MarketplaceIndexPage() {
  return <MarketplaceLanding />;
}
