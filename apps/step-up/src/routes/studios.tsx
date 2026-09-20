import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import {
  marketplaceNavigateArgs,
  parseMarketplaceSearch,
} from "@/modules/marketplace/search";

export const Route = createFileRoute("/studios")({
  validateSearch: parseMarketplaceSearch,
  beforeLoad: ({ search }) => {
    const target = marketplaceNavigateArgs("studios", search);
    if (target.to !== "/$city/$place" || !target.params) return;
    throw redirect({
      to: target.to,
      params: target.params,
      search: target.search,
      replace: true,
    });
  },
  component: MarketplaceStudiosPage,
});

function MarketplaceStudiosPage() {
  const search = Route.useSearch();
  return <MarketplaceHome tab="studios" search={search} />;
}
