import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import {
  marketplaceNavigateArgs,
  parseMarketplaceSearch,
} from "@/modules/marketplace/search";

export const Route = createFileRoute("/")({
  validateSearch: parseMarketplaceSearch,
  beforeLoad: ({ search }) => {
    const target = marketplaceNavigateArgs("classes", search);
    if (target.to !== "/$city/$place" || !target.params) return;
    throw redirect({
      to: target.to,
      params: target.params,
      search: target.search,
      replace: true,
    });
  },
  component: MarketplaceIndexPage,
});

function MarketplaceIndexPage() {
  const search = Route.useSearch();
  return <MarketplaceHome tab="classes" search={search} />;
}
