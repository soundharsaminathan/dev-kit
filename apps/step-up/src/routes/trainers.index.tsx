import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import { parseMarketplaceSearch } from "@/modules/marketplace/search";

export const Route = createFileRoute("/trainers/")({
  validateSearch: parseMarketplaceSearch,
  component: MarketplaceTrainersPage,
});

function MarketplaceTrainersPage() {
  const search = Route.useSearch();
  return <MarketplaceHome tab="trainers" search={search} />;
}
