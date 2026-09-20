import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import { parseMarketplaceSearch } from "@/modules/marketplace/search";

export const Route = createFileRoute("/studios")({
  validateSearch: parseMarketplaceSearch,
  component: MarketplaceStudiosPage,
});

function MarketplaceStudiosPage() {
  const search = Route.useSearch();
  return <MarketplaceHome tab="studios" search={search} />;
}
