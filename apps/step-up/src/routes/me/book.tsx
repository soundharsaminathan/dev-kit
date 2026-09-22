import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import { parseMarketplaceSearch } from "@/modules/marketplace/search";

export const Route = createFileRoute("/me/book")({
  validateSearch: parseMarketplaceSearch,
  component: BookPage,
});

function BookPage() {
  const search = Route.useSearch();
  return (
    <MarketplaceHome
      tab={search.tab ?? "classes"}
      search={search}
      variant="member"
    />
  );
}
