import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import { parseMarketplaceSearch } from "@/modules/marketplace/search";

export const Route = createFileRoute("/classes")({
  validateSearch: parseMarketplaceSearch,
  component: MarketplaceClassesPage,
});

function MarketplaceClassesPage() {
  const search = Route.useSearch();
  return <MarketplaceHome tab="classes" search={search} />;
}
